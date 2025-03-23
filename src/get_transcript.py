import sys
from youtube_transcript_api import YouTubeTranscriptApi

video_id = sys.argv[1]
transcript = YouTubeTranscriptApi.get_transcript(video_id)
text = " ".join([t['text'] for t in transcript])
print(text)
