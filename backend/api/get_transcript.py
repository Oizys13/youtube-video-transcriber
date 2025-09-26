from youtube_transcript_api import YouTubeTranscriptApi
import sys

def get_transcript(video_id):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join([entry['text'] for entry in transcript])
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    video_id = sys.argv[1]
    print(get_transcript(video_id))