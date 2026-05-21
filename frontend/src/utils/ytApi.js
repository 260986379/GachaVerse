let ytApiLoaded = false

export function loadYTApi(onReady) {
  if (window.YT?.Player) { onReady(); return }
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => { prev?.(); onReady() }
  if (!ytApiLoaded) {
    ytApiLoaded = true
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }
}
