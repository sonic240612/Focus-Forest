import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import './App.css'

const MIN_CYCLES = 1
const MAX_CYCLES = 10

function App() {
  const [focusMins, setFocusMins] = useState(25)
  const [focusSecs, setFocusSecs] = useState(0)

  const [breakMins, setBreakMins] = useState(5)
  const [breakSecs, setBreakSecs] = useState(0)

  const [totalCycles, setTotalCycles] = useState(4)
  const [currentCycle, setCurrentCycle] = useState(1)

  const totalFocusSecs = focusMins * 60 + focusSecs
  const totalBreakSecs = breakMins * 60 + breakSecs

  const [timeLeft, setTimeLeft] = useState(totalFocusSecs)
  const [isRunning, setIsRunning] = useState(false)
  const [isFocus, setIsFocus] = useState(true)

  // Live system time state
  const [systemTime, setSystemTime] = useState(new Date())

  // Sound player states (Default volume 10%)
  const [selectedSound, setSelectedSound] = useState('rain') // 'rain' or 'whitenoise'
  const [isPlayingSound, setIsPlayingSound] = useState(false)
  const [volume, setVolume] = useState(0.1)

  const audioRef = useRef(null)
  const bellRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Audio source management with balance multiplier for rain sound
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = true
      const balanceMultiplier = selectedSound === 'rain' ? 0.35 : 1.0
      audioRef.current.volume = Math.min(1.0, volume * balanceMultiplier)
    }
  }, [volume, selectedSound])

  const playBell = () => {
    if (bellRef.current) {
      bellRef.current.currentTime = 0
      bellRef.current.volume = 0.4
      bellRef.current.play().catch(err => {
        console.log("Bell sound playback error:", err)
      })
    }
  }

  const handleSoundToggle = () => {
    if (!audioRef.current) return
    if (isPlayingSound) {
      audioRef.current.pause()
      setIsPlayingSound(false)
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingSound(true)
      }).catch(err => {
        console.log("Audio playback prevented or error:", err)
      })
    }
  }

  const handleSoundChange = (soundType) => {
    setSelectedSound(soundType)
    setIsPlayingSound(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const soundFileSrc = selectedSound === 'rain' ? '/rain_sound.mp3' : '/white_noise.mp3'

  const handleTimerComplete = useCallback(() => {
    playBell() // Play bell on mode transition
    if (isFocus) {
      setIsFocus(false)
      setTimeLeft(totalBreakSecs)
      setIsRunning(true)
    } else {
      if (currentCycle >= totalCycles) {
        setIsRunning(false)
        setIsFocus(true)
        setCurrentCycle(1)
        setTimeLeft(totalFocusSecs)
      } else {
        setCurrentCycle(c => c + 1)
        setIsFocus(true)
        setTimeLeft(totalFocusSecs)
        setIsRunning(true)
      }
    }
  }, [isFocus, currentCycle, totalCycles, totalFocusSecs, totalBreakSecs])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleTimerComplete()
    }
  }, [timeLeft, isRunning, handleTimerComplete])

  const toggle = useCallback(() => {
    if (!isRunning) {
      playBell()
    }
    setIsRunning(r => !r)
  }, [isRunning])

  // Global Spacebar shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        // Do not trigger if user is typing inside an input or textarea
        const activeTag = document.activeElement?.tagName?.toLowerCase()
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
          return
        }
        e.preventDefault() // Prevent page scrolling on Space bar
        if (!isRunning) {
          playBell()
        }
        setIsRunning(r => !r)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunning])

  const reset = () => {
    setIsRunning(false)
    setIsFocus(true)
    setCurrentCycle(1)
    setTimeLeft(totalFocusSecs)
  }

  const handleFocusMinsChange = (val) => {
    let m = Math.max(0, Math.min(120, Number(val)))
    let s = focusSecs
    if (m === 0 && s === 0) s = 10
    setFocusMins(m)
    setFocusSecs(s)
    if (!isRunning && isFocus) {
      setTimeLeft(m * 60 + s)
    }
  }

  const handleFocusSecsChange = (val) => {
    let s = Math.max(0, Math.min(59, Number(val)))
    let m = focusMins
    if (m === 0 && s === 0) m = 1
    setFocusMins(m)
    setFocusSecs(s)
    if (!isRunning && isFocus) {
      setTimeLeft(m * 60 + s)
    }
  }

  const handleBreakMinsChange = (val) => {
    let m = Math.max(0, Math.min(120, Number(val)))
    let s = breakSecs
    if (m === 0 && s === 0) s = 10
    setBreakMins(m)
    setBreakSecs(s)
    if (!isRunning && !isFocus) {
      setTimeLeft(m * 60 + s)
    }
  }

  const handleBreakSecsChange = (val) => {
    let s = Math.max(0, Math.min(59, Number(val)))
    let m = breakMins
    if (m === 0 && s === 0) m = 1
    setBreakMins(m)
    setBreakSecs(s)
    if (!isRunning && !isFocus) {
      setTimeLeft(m * 60 + s)
    }
  }

  const handleCyclesChange = (val) => {
    const c = Math.max(MIN_CYCLES, Math.min(MAX_CYCLES, Number(val)))
    setTotalCycles(c)
    if (currentCycle > c) setCurrentCycle(c)
  }

  const scheduleTimeline = useMemo(() => {
    const timeline = []
    const now = new Date()
    const activeTotalDuration = isFocus ? totalFocusSecs : totalBreakSecs
    const elapsedSecs = activeTotalDuration - timeLeft
    const currentSessionStart = new Date(now.getTime() - elapsedSecs * 1000)

    let activeIndex = 0
    const allRounds = []
    for (let c = 1; c <= totalCycles; c++) {
      allRounds.push({ cycle: c, type: 'focus', duration: totalFocusSecs })
      if (c <= totalCycles) {
        allRounds.push({ cycle: c, type: 'break', duration: totalBreakSecs })
      }
    }

    allRounds.forEach((r, idx) => {
      if (r.cycle === currentCycle && r.type === (isFocus ? 'focus' : 'break')) {
        activeIndex = idx
      }
    })

    const times = new Array(allRounds.length)
    times[activeIndex] = { 
      start: currentSessionStart, 
      end: new Date(currentSessionStart.getTime() + allRounds[activeIndex].duration * 1000) 
    }

    let prevCursor = currentSessionStart
    for (let i = activeIndex - 1; i >= 0; i--) {
      const durationMs = allRounds[i].duration * 1000
      const start = new Date(prevCursor.getTime() - durationMs)
      times[i] = { start, end: prevCursor }
      prevCursor = start
    }

    let nextCursor = times[activeIndex].end
    for (let i = activeIndex + 1; i < allRounds.length; i++) {
      const durationMs = allRounds[i].duration * 1000
      const end = new Date(nextCursor.getTime() + durationMs)
      times[i] = { start: nextCursor, end }
      nextCursor = end
    }

    allRounds.forEach((r, idx) => {
      timeline.push({
        cycle: r.cycle,
        type: r.type,
        start: times[idx].start,
        end: times[idx].end,
      })
    })

    return timeline
  }, [totalFocusSecs, totalBreakSecs, totalCycles, currentCycle, isFocus, timeLeft, isRunning ? systemTime : null])

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const formatSystemTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')

  return (
    <div className={`app ${isFocus ? 'focus-mode' : 'break-mode'}`}>
      <audio ref={audioRef} src={soundFileSrc} loop preload="auto" />
      <audio ref={bellRef} src="/bell.mp3" preload="auto" />
      <h1 className="title">Focus Forest</h1>
      <div className="layout-container three-columns">
        {/* Left Panel: Background Sound Player */}
        <div className="sound-panel">
          <div className="timeline-section sound-section">
            <h3 className="timeline-title">Background Sound</h3>
            <div className="sound-type-selector vertical">
              <button
                type="button"
                className={`sound-btn ${selectedSound === 'rain' ? 'active' : ''}`}
                onClick={() => handleSoundChange('rain')}
              >
                🌧️ 빗소리 (Rain)
              </button>
              <button
                type="button"
                className={`sound-btn ${selectedSound === 'whitenoise' ? 'active' : ''}`}
                onClick={() => handleSoundChange('whitenoise')}
              >
                🌊 화이트노이즈 (White Noise)
              </button>
            </div>
            <div className="sound-player-box">
              <button
                type="button"
                className={`btn sound-toggle-btn-lg ${isPlayingSound ? 'playing' : ''}`}
                onClick={handleSoundToggle}
              >
                {isPlayingSound ? '⏸ PAUSE SOUND' : '▶ PLAY SOUND'}
              </button>
              <div className="volume-control-group">
                <span className="sub-label">Volume</span>
                <input
                  type="range"
                  className="slider"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                />
                <span className="volume-val">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel: Timer & Settings */}
        <div className="left-panel">
          <div className="card">
            <div className="cycle-badge">Cycle {currentCycle} / {totalCycles}</div>
            <span className="mode">{isFocus ? 'FOCUS' : 'BREAK'}</span>
            <div className="current-time">{formatSystemTime(systemTime)}</div>
            <div className="timer">{mins}:{secs}</div>
            <div className="controls">
              <button onClick={toggle} className="btn primary">
                {isRunning ? 'PAUSE' : 'START'}
              </button>
              <button onClick={reset} className="btn secondary">RESET</button>
            </div>
          </div>

          <div className="settings">
            {/* Focus Duration */}
            <div className="setting-block">
              <label className="setting-label">Focus Duration</label>
              
              <div className="setting-row">
                <span className="sub-label">Min</span>
                <div className="setting-inputs">
                  <input
                    type="range"
                    className="slider"
                    min={0}
                    max={120}
                    value={focusMins}
                    onChange={e => handleFocusMinsChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <input
                    type="number"
                    className="number-input"
                    min={0}
                    max={120}
                    value={focusMins}
                    onChange={e => handleFocusMinsChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <span className="unit">min</span>
                </div>
              </div>

              <div className="setting-row">
                <span className="sub-label">Sec</span>
                <div className="setting-inputs">
                  <input
                    type="range"
                    className="slider"
                    min={0}
                    max={50}
                    step={10}
                    value={Math.min(50, focusSecs)}
                    onChange={e => handleFocusSecsChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <input
                    type="number"
                    className="number-input"
                    min={0}
                    max={59}
                    step={1}
                    value={focusSecs}
                    onChange={e => handleFocusSecsChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <span className="unit">sec</span>
                </div>
              </div>
            </div>

            {/* Break Duration */}
            <div className="setting-block">
              <label className="setting-label">Break Duration</label>
              
              <div className="setting-row">
                <span className="sub-label">Min</span>
                <div className="setting-inputs">
                  <input
                    type="range"
                    className="slider"
                    min={0}
                    max={120}
                    value={breakMins}
                    onChange={e => handleBreakMinsChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <input
                    type="number"
                    className="number-input"
                    min={0}
                    max={120}
                    value={breakMins}
                    onChange={e => handleBreakMinsChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <span className="unit">min</span>
                </div>
              </div>

              <div className="setting-row">
                <span className="sub-label">Sec</span>
                <div className="setting-inputs">
                  <input
                    type="range"
                    className="slider"
                    min={0}
                    max={50}
                    step={10}
                    value={Math.min(50, breakSecs)}
                    onChange={e => handleBreakSecsChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <input
                    type="number"
                    className="number-input"
                    min={0}
                    max={59}
                    step={1}
                    value={breakSecs}
                    onChange={e => handleBreakSecsChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <span className="unit">sec</span>
                </div>
              </div>
            </div>

            {/* Total Cycles */}
            <div className="setting-block">
              <label className="setting-label">Total Cycles</label>
              <div className="setting-row">
                <div className="setting-inputs">
                  <input
                    type="range"
                    className="slider"
                    min={MIN_CYCLES}
                    max={MAX_CYCLES}
                    value={totalCycles}
                    onChange={e => handleCyclesChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <input
                    type="number"
                    className="number-input"
                    min={MIN_CYCLES}
                    max={MAX_CYCLES}
                    value={totalCycles}
                    onChange={e => handleCyclesChange(e.target.value)}
                    disabled={isRunning}
                  />
                  <span className="unit">rds</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Schedule Timeline */}
        <div className="right-panel">
          <div className="timeline-section">
            <h3 className="timeline-title">Today's Schedule Timeline</h3>
            <div className="timeline-list">
              {scheduleTimeline.map((item, idx) => {
                const isActive = item.cycle === currentCycle && item.type === (isFocus ? 'focus' : 'break')
                return (
                  <div key={idx} className={`timeline-item ${item.type} ${isActive ? 'active' : ''}`}>
                    <span className="timeline-round">
                      {item.type === 'focus' ? `Round ${item.cycle} Focus` : `Round ${item.cycle} Break`}
                    </span>
                    <span className="timeline-time">
                      {formatTime(item.start)} - {formatTime(item.end)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
