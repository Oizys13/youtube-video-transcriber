from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import subprocess
import json
import os
import logging
import webvtt  # Install with `pip install webvtt-py`
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

@csrf_exempt
def transcript(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        video_id = data.get('videoId')
        logger.info(f"Received request for video_id: {video_id}")
        if not video_id:
            return JsonResponse({'error': 'Video ID is required'}, status=400)
        
        # Try yt-dlp first
        subtitle_file = f"temp.{video_id}.en.vtt"
        try:
            result = subprocess.run(
                ['yt-dlp', '--skip-download', '--write-auto-sub', '--sub-lang', 'en', '--sub-format', 'vtt', f'https://www.youtube.com/watch?v={video_id}', '-o', f'temp.{video_id}'],
                capture_output=True, text=True
            )
            if result.returncode != 0:
                logger.error(f"yt-dlp error: {result.stderr}")
                raise Exception(f"yt-dlp failed: {result.stderr}")
            
            # Parse VTT file
            if os.path.exists(subtitle_file):
                vtt = webvtt.read(subtitle_file)
                text = " ".join([caption.text for caption in vtt])
                logger.info(f"Transcript fetched via yt-dlp: {text[:100]}...")
                return JsonResponse({'text': text})
            else:
                raise Exception("Subtitle file not generated")
        except Exception as e:
            logger.warning(f"yt-dlp failed: {str(e)}, falling back to youtube_transcript_api")
        
        # Fallback to youtube_transcript_api
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            text = " ".join([entry['text'] for entry in transcript])
            logger.info(f"Transcript fetched via youtube_transcript_api: {text[:100]}...")
            return JsonResponse({'text': text})
        except TranscriptsDisabled:
            logger.error("Transcripts disabled for video")
            return JsonResponse({'error': 'Failed to fetch transcript', 'details': 'Transcripts are disabled for this video'}, status=400)
        except NoTranscriptFound:
            logger.error("No transcript found for video")
            return JsonResponse({'error': 'Failed to fetch transcript', 'details': 'No transcript found for this video'}, status=400)
        except Exception as e:
            logger.error(f"youtube_transcript_api error: {str(e)}")
            raise e
    except Exception as e:
        logger.error(f"Error fetching transcript: {str(e)}")
        return JsonResponse({'error': 'Failed to fetch transcript', 'details': str(e)}, status=500)
    finally:
        # Clean up subtitle file
        if os.path.exists(subtitle_file):
            os.remove(subtitle_file)

@csrf_exempt
def summarize(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        text = data.get('text')
        if not text or text.strip() == '':
            return JsonResponse({'error': 'Missing or empty "text" in request body'}, status=400)
        
        response = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}',
            json={
                'contents': [{
                    'parts': [{
                        'text': f'Summarize this transcript into a **concise summary** with key points:\n\n{text}'
                    }]
                }]
            },
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()
        
        response_data = response.json()
        summary = response_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'Failed to generate summary.')
        return JsonResponse({'summary': summary})
    except Exception as e:
        return JsonResponse({'error': 'Failed to generate summary', 'details': str(e)}, status=500)