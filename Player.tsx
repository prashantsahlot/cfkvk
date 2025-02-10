import logging
from threading import Lock
from pyrogram import Client, filters
from pytgcalls import idle, PyTgCalls
from pytgcalls.types import MediaStream
import aiohttp
import asyncio
from pyrogram.types import Message, CallbackQuery
import isodate
import os
import re
import time
import psutil
from datetime import timedelta
import uuid
import tempfile
from pyrogram.types import InlineKeyboardButton, InlineKeyboardMarkup, InputMediaPhoto
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from pyrogram.enums import ChatType, ChatMemberStatus
from typing import Union
from pytgcalls.types import Update
from pytgcalls import filters as fl
import requests
from io import BytesIO
from PIL import ImageEnhance
import urllib.parse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Bot and Assistant session strings
API_ID = 29385418  # Replace with your actual API ID
API_HASH = "5737577bcb32ea1aac1ac394b96c4b10"  # Replace with your actual API Hash
BOT_TOKEN = "7598576464:AAHTQqNDdgD_DyzOfo_ET2an0OTLtd-S7io"  # Replace with your bot token
ASSISTANT_SESSION = "BQHAYsoAJ9RdtV1ZdC0mlgJ7alGjC9oLREK2LffYsrp6wk3H0yoYwx6Utt71TDGTiFQ6-lkLt-5mZOWFQPjXVjjADigxuXOgcDIl7VCGDwMgB6RH-PLofhBKXWxEfQyXViEtmDQI6xG3PXSy7ik4q5Mpv-pVfORq9vEBTtZDuZGDK5peo-VbSXpsbK3fHr3YwWMApDp4MlPZFChf93WmyvOpNVRmEzVX05vgUATC7m3Z9BXbEhaLtrL_v0d1JjMXLVQSJks_9JdSpwtwxFRX2PTRZm9U0UsAol9KSPFDb2wm6dTp9Mvi9L_ClWYAlObIUPc0E-geSF9tIOoz3YP6S9rVW6PmIQAAAAG4QLY7AA"
bot = Client("music_bot1", bot_token=BOT_TOKEN, api_id=API_ID, api_hash=API_HASH)
assistant = Client("assistant_account", session_string=ASSISTANT_SESSION)
call_py = PyTgCalls(assistant)

ASSISTANT_USERNAME = "@Frozensupporter1"
ASSISTANT_CHAT_ID = 7386215995

# API Endpoints
API_URL = "https://odd-block-a945.tenopno.workers.dev/search?title="
DOWNLOAD_API_URL = "https://frozen-youtube-api-search-link-ksog.onrender.com/download?url="

# Containers for song queues per chat/group
chat_containers = {}
playback_tasks = {}  # To manage playback tasks per chat
bot_start_time = time.time()
COOLDOWN = 10
chat_last_command = {}
chat_pending_commands = {}
QUEUE_LIMIT = 5
MAX_DURATION_SECONDS = 2 * 60 * 60  # 2 hours 10 minutes (in seconds)
LOCAL_VC_LIMIT = 4
api_playback_records = []
playback_mode = {}  # Stores "local" or "api" for each chat
queue_locks = {}  # For thread-safe queue operations
download_cache = {}  # Global cache dictionary

# Circuit Breaker for API
class APICircuitBreaker:
    def __init__(self):
        self.failures = 0
        self.last_failure = 0

    async def call_api(self, url):
        if time.time() - self.last_failure < 60 and self.failures > 3:
            raise Exception("API circuit breaker open")
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise Exception(f"API returned {resp.status}")
                    data = await resp.json()
                    if not data.get("status") == "playing":
                        raise Exception("API failed to start playback")
                    return data
        except Exception as e:
            self.failures += 1
            self.last_failure = time.time()
            raise

api_circuit_breaker = APICircuitBreaker()

# Helper Functions
async def safe_queue_op(chat_id, func):
    if chat_id not in queue_locks:
        queue_locks[chat_id] = Lock()
    with queue_locks[chat_id]:
        return await func()

async def download_audio(url):
    """Downloads the audio from a given URL and returns the file path.
    Uses caching to avoid re-downloading the same file.
    """
    if url in download_cache and os.path.exists(download_cache[url]):
        return download_cache[url]

    try:
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        file_name = temp_file.name
        download_url = f"{DOWNLOAD_API_URL}{url}"
        async with aiohttp.ClientSession() as session:
            async with session.get(download_url) as response:
                if response.status == 200:
                    with open(file_name, 'wb') as f:
                        f.write(await response.read())
                    download_cache[url] = file_name
                    return file_name
                else:
                    raise Exception(f"Failed to download audio. HTTP status: {response.status}")
    except Exception as e:
        raise Exception(f"Error downloading audio: {e}")

async def fetch_youtube_link(query):
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
            async with session.get(f"{API_URL}{query}") as response:
                if response.status == 200:
                    data = await response.json()
                    required_keys = ["link", "title", "duration"]
                    if not all(key in data for key in required_keys):
                        raise Exception("Invalid API response format")
                    if not data["link"].startswith("https://"):
                        raise Exception("Invalid audio URL from API")
                    return (
                        data.get("link"),
                        data.get("title"),
                        data.get("duration"),
                        data.get("thumbnail")
                    )
                else:
                    raise Exception(f"API returned status code {response.status}")
    except Exception as e:
        raise Exception(f"Failed to fetch YouTube link: {str(e)}")

async def start_playback_task(chat_id, message):
    """
    Starts playback for the given chat.
    If the local VC limit is reached, the external API is used.
    """
    logger.info(f"Starting playback task for chat {chat_id}")

    if chat_id not in chat_containers or len(chat_containers[chat_id]) == 0:
        logger.warning(f"Playback started for empty queue in {chat_id}")
        return

    current_song = chat_containers[chat_id][0]
    if not current_song.get("url"):
        logger.error(f"Invalid song entry in {chat_id}")
        chat_containers[chat_id].pop(0)
        return

    # Use the external API if local VC limit has been reached.
    if chat_id not in playback_tasks and len(playback_tasks) >= LOCAL_VC_LIMIT:
        song_info = chat_containers[chat_id][0]
        video_title = song_info.get('title', 'Unknown')
        encoded_title = urllib.parse.quote(video_title)
        api_url = f"https://py-tgcalls-api1.onrender.com/play?chatid={chat_id}&title={encoded_title}"
        try:
            data = await api_circuit_breaker.call_api(api_url)
            playback_mode[chat_id] = "api"
            control_buttons = InlineKeyboardMarkup(
                [
                    [
                        InlineKeyboardButton(text="▶️", callback_data="pause"),
                        InlineKeyboardButton(text="⏸", callback_data="resume"),
                        InlineKeyboardButton(text="⏭", callback_data="skip"),
                        InlineKeyboardButton(text="⏹", callback_data="stop")
                    ],
                    [
                        InlineKeyboardButton(text="✨ Updates ✨", url="https://t.me/vibeshiftbots"),
                        InlineKeyboardButton(text="💕 Support 💕", url="https://t.me/Frozensupport1"),
                    ]
                ]
            )
            await bot.send_photo(
                chat_id,
                photo=song_info['thumbnail'],
                caption=(
                    f"✨ **ɴᴏᴡ ᴘʟᴀʏɪɴɢ**\n\n"
                    f"✨**Title:** {song_info['title']}\n\n"
                    f"✨**Duration:** {song_info['duration']}\n\n"
                    f"✨**Requested by:** {song_info['requester']}"
                ),
                reply_markup=control_buttons
            )
        except Exception as e:
            logger.error(f"API Error: {e}")
            await message.reply(f"❌ API Error: {str(e)}. Falling back to local playback.")
            playback_mode[chat_id] = "local"
            await start_local_playback(chat_id, message)
    else:
        await start_local_playback(chat_id, message)

async def start_local_playback(chat_id, message):
    playback_mode[chat_id] = "local"
    try:
        if chat_id in playback_tasks:
            playback_tasks[chat_id].cancel()

        song_info = chat_containers[chat_id][0]
        video_url = song_info.get('url')
        if not video_url:
            logger.error(f"Invalid video URL for song: {song_info}")
            chat_containers[chat_id].pop(0)
            return

        await message.edit(f"✨ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ... \n\n{song_info['title']}\n\n ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ 💕")
        media_path = await download_audio(video_url)

        await call_py.play(
            chat_id,
            MediaStream(
                media_path,
                video_flags=MediaStream.Flags.IGNORE
            )
        )

        playback_tasks[chat_id] = asyncio.current_task()

        control_buttons = InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton(text="▶️", callback_data="pause"),
                    InlineKeyboardButton(text="⏸", callback_data="resume"),
                    InlineKeyboardButton(text="⏭", callback_data="skip"),
                    InlineKeyboardButton(text="⏹", callback_data="stop")
                ],
                [
                    InlineKeyboardButton(text="✨ Updates ✨", url="https://t.me/vibeshiftbots"),
                    InlineKeyboardButton(text="💕 Support 💕", url="https://t.me/Frozensupport1"),
                ]
            ]
        )

        await message.reply_photo(
            photo=song_info['thumbnail'],
            caption=(
                f"✨ **ɴᴏᴡ ᴘʟᴀʏɪɴɢ**\n\n"
                f"✨**Title:** {song_info['title']}\n\n"
                f"✨**Duration:** {song_info['duration']}\n\n"
                f"✨**Requested by:** {song_info['requester']}"
            ),
            reply_markup=control_buttons
        )
        await message.delete()
    except Exception as playback_error:
        logger.error(f"Playback Error: {playback_error}")
        await message.reply(f"❌ Playback error for **{song_info['title']}**. Skipping to the next song...")
        chat_containers[chat_id].pop(0)
        await start_playback_task(chat_id, message)

# Health Monitoring
async def health_check():
    while True:
        await asyncio.sleep(300)
        if psutil.virtual_memory().percent > 90:
            logger.critical("High memory usage!")
        if len(playback_tasks) > LOCAL_VC_LIMIT * 2:
            logger.warning(f"High VC count: {len(playback_tasks)}")

# Start the bot
if __name__ == "__main__":
    try:
        logger.info("Starting Frozen Music Bot...")
        asyncio.create_task(health_check())
        call_py.start()
        bot.start()
        if not assistant.is_connected:
            assistant.start()
        idle()
    except KeyboardInterrupt:
        logger.info("Bot stopped by user.")
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        logger.info("Stopping bot, assistant, and call client...")
        bot.stop()
        assistant.stop()
        call_py.stop()