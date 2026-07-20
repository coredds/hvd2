const PROGRESS_RE = /(\d+(?:\.\d+)?)%/
const DESTINATION_RE = /\[download\] Destination: (.+)/
const FINAL_DESTINATION_RE = /\[Merger\] Merging formats into "(.+)"/
const THUMBNAIL_RE = /\[download\] (.+\.(jpg|jpeg|png|webp)) has already been downloaded/
const THUMBNAIL_WRITING_RE = /\[info\] Writing video thumbnail (.+\.(jpg|jpeg|png|webp)) to: (.+)/
const FFMPEG_RE = /\[ffmpeg\]/
const POST_PROCESS_RE = /\[PostProcessor\]/

export const TEMP_FILE_REs = [
  /\.f\d+\.(mp4|webm|m4a|aac)$/,
  /\.temp\.(mp4|webm|m4a)$/,
  /\.part$/,
  /\.ytdl$/,
]
export const THUMBNAIL_EXT_RE = /\.(png|webp|jpg|jpeg)$/

export interface ParseResult {
  /** Updated post-processing state after parsing the line */
  inPostProcessing: boolean
  /** True if this line caused a transition into post-processing */
  enteredPostProcessing: boolean
  progress?: number
  statusKey?: string
  destination?: {
    path: string
    isIntermediate: boolean
  }
  thumbnails: string[]
  finalFilePath?: string
}

/**
 * Parse a single line of yt-dlp output and extract progress/status/file events.
 * The function is pure: it expects the caller to maintain the `inPostProcessing`
 * state and pass it back on the next call.
 */
export function parseDownloadLine(
  line: string,
  inPostProcessing: boolean,
  embedThumbnail: boolean,
): ParseResult {
  const result: ParseResult = {
    inPostProcessing,
    enteredPostProcessing: false,
    thumbnails: [],
  }

  if (FFMPEG_RE.test(line) || POST_PROCESS_RE.test(line)) {
    if (!inPostProcessing) {
      result.inPostProcessing = true
      result.enteredPostProcessing = true
      result.progress = 0.95
      result.statusKey = 'status.reencoding'
    }
  }

  const progMatch = line.match(PROGRESS_RE)
  if (progMatch && !result.inPostProcessing) {
    result.progress = parseFloat(progMatch[1]) / 100
  }

  const destMatch = line.match(DESTINATION_RE)
  if (destMatch) {
    const path = destMatch[1]
    const isTemp = TEMP_FILE_REs.some((re) => re.test(path))
    const isThumbnail = THUMBNAIL_EXT_RE.test(path)
    result.destination = {
      path,
      isIntermediate: isTemp || (embedThumbnail && isThumbnail),
    }
  }

  const cachedThumbMatch = line.match(THUMBNAIL_RE)
  if (cachedThumbMatch && embedThumbnail) {
    result.thumbnails.push(cachedThumbMatch[1])
  }

  const writingThumbMatch = line.match(THUMBNAIL_WRITING_RE)
  if (writingThumbMatch && embedThumbnail) {
    result.thumbnails.push(writingThumbMatch[3])
  }

  const finalMatch = line.match(FINAL_DESTINATION_RE)
  if (finalMatch) {
    result.finalFilePath = finalMatch[1]
    result.statusKey = 'status.merging'
  }

  return result
}
