package expo.modules.wakeproofalarmaudio

import android.content.Context
import android.content.pm.ApplicationInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class WakeProofAlarmAudioModule : Module() {
  private var player: MediaPlayer? = null
  private var activeSessionId: String? = null
  private var originalAlarmVolumeIndex: Int? = null
  private var audioFocusRequest: AudioFocusRequest? = null
  private var audioFocusHeld = false

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private val audioManager: AudioManager
    get() = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  private val alarmAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_ALARM)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()

  private val focusListener = AudioManager.OnAudioFocusChangeListener {}

  override fun definition() = ModuleDefinition {
    Name("WakeProofAlarmAudio")

    AsyncFunction("startAlarm") { sessionId: String, uri: String, sourceType: String ->
      if (player != null && activeSessionId == sessionId) {
        logPlayer("skip", sessionId, sourceType, true)
        return@AsyncFunction mapOf("started" to false, "alreadyActive" to true, "sessionId" to sessionId, "sourceType" to sourceType, "audioFocusAcquired" to audioFocusHeld)
      }
      val replacedSessionId = activeSessionId
      releasePlayer("replace", sourceType)
      val normalizedUri = normalizeLocalUri(uri)
      val volumeInfo = maximizeVolume()
      val focusAcquired = requestAudioFocus()
      if (!focusAcquired) throw IllegalStateException("Unable to acquire alarm audio focus.")
      val nextPlayer = MediaPlayer()
      try {
        nextPlayer.setAudioAttributes(alarmAttributes)
        nextPlayer.setDataSource(context, normalizedUri)
        nextPlayer.isLooping = true
        nextPlayer.prepare()
        nextPlayer.start()
      } catch (error: Exception) {
        safelyRelease(nextPlayer)
        abandonAudioFocus()
        logPlayer("start-failed", sessionId, sourceType, false)
        throw error
      }
      player = nextPlayer
      activeSessionId = sessionId
      logPlayer(if (replacedSessionId == null) "start" else "replace-start", sessionId, sourceType, true)
      mapOf(
        "started" to true,
        "alreadyActive" to false,
        "sessionId" to sessionId,
        "replacedSessionId" to replacedSessionId,
        "sourceType" to sourceType,
        "audioFocusAcquired" to audioFocusHeld,
        "volume" to volumeInfo
      )
    }

    AsyncFunction("stopAlarm") {
      val stoppedSessionId = activeSessionId
      val released = releasePlayer("stop", "active")
      mapOf("stopped" to released, "sessionId" to stoppedSessionId, "audioFocusReleased" to !audioFocusHeld)
    }

    AsyncFunction("maximizeAlarmVolume") {
      maximizeVolume()
    }

    AsyncFunction("restoreAlarmVolume") { clearSnapshot: Boolean ->
      restoreVolume(clearSnapshot)
    }

    AsyncFunction("getAlarmVolumeInfo") {
      getVolumeInfo()
    }

    OnDestroy {
      releasePlayer("module-destroy", "active")
      restoreVolume(true)
    }
  }

  private fun normalizeLocalUri(value: String): Uri {
    if (value.isBlank()) throw IllegalArgumentException("Alarm ringtone URI is empty.")
    val parsed = Uri.parse(value)
    if (parsed.scheme == null) {
      val file = File(value)
      if (!file.isFile || !file.canRead()) throw IllegalArgumentException("Alarm ringtone file is not readable.")
      return Uri.fromFile(file)
    }
    if (parsed.scheme == "file") {
      val path = parsed.path ?: throw IllegalArgumentException("Alarm ringtone file path is invalid.")
      val file = File(path)
      if (!file.isFile || !file.canRead()) throw IllegalArgumentException("Alarm ringtone file is not readable.")
      return Uri.fromFile(file)
    }
    if (parsed.scheme == "content") return parsed
    throw IllegalArgumentException("Alarm ringtone must be a local file or content URI.")
  }

  private fun requestAudioFocus(): Boolean {
    if (audioFocusHeld) return true
    val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(alarmAttributes)
        .setOnAudioFocusChangeListener(focusListener)
        .build()
      audioFocusRequest = request
      audioManager.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
    }
    audioFocusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    logFocus("request", audioFocusHeld)
    return audioFocusHeld
  }

  private fun abandonAudioFocus() {
    if (!audioFocusHeld && audioFocusRequest == null) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      audioFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      audioManager.abandonAudioFocus(focusListener)
    }
    audioFocusRequest = null
    audioFocusHeld = false
    logFocus("release", true)
  }

  private fun maximizeVolume(): Map<String, Any?> {
    val currentIndex = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
    if (originalAlarmVolumeIndex == null) originalAlarmVolumeIndex = currentIndex
    val maxIndex = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
    audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxIndex, 0)
    val afterSetIndex = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
    val result = mapOf(
      "originalIndex" to originalAlarmVolumeIndex,
      "maxIndex" to maxIndex,
      "afterSetIndex" to afterSetIndex,
      "isMax" to (afterSetIndex == maxIndex)
    )
    logVolume("maximize", result)
    return result
  }

  private fun restoreVolume(clearSnapshot: Boolean): Map<String, Any?> {
    val originalIndex = originalAlarmVolumeIndex
    if (originalIndex == null) return getVolumeInfo() + mapOf("restored" to false, "reason" to "NO_SNAPSHOT")
    val beforeRestoreIndex = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
    if (beforeRestoreIndex != originalIndex) audioManager.setStreamVolume(AudioManager.STREAM_ALARM, originalIndex, 0)
    val afterRestoreIndex = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
    val restored = afterRestoreIndex == originalIndex
    if (clearSnapshot && restored) originalAlarmVolumeIndex = null
    val result = mapOf(
      "originalIndex" to originalIndex,
      "maxIndex" to audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM),
      "beforeRestoreIndex" to beforeRestoreIndex,
      "afterRestoreIndex" to afterRestoreIndex,
      "restored" to restored,
      "snapshotCleared" to (clearSnapshot && restored)
    )
    logVolume("restore", result)
    return result
  }

  private fun getVolumeInfo(): Map<String, Any?> {
    val currentIndex = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
    val maxIndex = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
    return mapOf(
      "originalIndex" to originalAlarmVolumeIndex,
      "currentIndex" to currentIndex,
      "maxIndex" to maxIndex,
      "isMax" to (currentIndex == maxIndex),
      "activeSessionId" to activeSessionId
    )
  }

  private fun releasePlayer(action: String, sourceType: String): Boolean {
    val releasedSessionId = activeSessionId
    val currentPlayer = player
    player = null
    activeSessionId = null
    if (currentPlayer != null) safelyRelease(currentPlayer)
    abandonAudioFocus()
    if (currentPlayer != null || releasedSessionId != null) logPlayer(action, releasedSessionId, sourceType, false)
    return currentPlayer != null
  }

  private fun safelyRelease(mediaPlayer: MediaPlayer) {
    try {
      if (mediaPlayer.isPlaying) mediaPlayer.stop()
    } catch (_: IllegalStateException) {}
    try {
      mediaPlayer.reset()
    } catch (_: IllegalStateException) {}
    mediaPlayer.release()
  }

  private fun isDebugBuild(): Boolean {
    return context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
  }

  private fun logPlayer(action: String, sessionId: String?, sourceType: String, focus: Boolean) {
    if (isDebugBuild()) Log.d("alarm-native-player", "action=$action sessionId=$sessionId sourceType=$sourceType usage=USAGE_ALARM audioFocus=$focus")
  }

  private fun logFocus(action: String, success: Boolean) {
    if (isDebugBuild()) Log.d("alarm-native-focus", "action=$action success=$success usage=USAGE_ALARM")
  }

  private fun logVolume(action: String, values: Map<String, Any?>) {
    if (isDebugBuild()) Log.d("alarm-native-volume", "action=$action originalIndex=${values["originalIndex"]} maxIndex=${values["maxIndex"]} afterSetIndex=${values["afterSetIndex"]}")
  }
}
