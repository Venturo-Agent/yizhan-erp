'use client'

import { useState, useEffect } from 'react'

interface PhoneFrameProps {
  children: React.ReactNode
  darkMode?: boolean
}

export function PhoneFrame({ children, darkMode = true }: PhoneFrameProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="phone-frame-container">
      <div className={`phone-frame ${darkMode ? 'phone-frame-dark' : 'phone-frame-light'}`}>
        <div className="phone-frame-notch">
          <div className="phone-frame-speaker" />
        </div>

        <div className="phone-frame-status-bar">
          <span className="phone-frame-time">{time}</span>
          <div className="phone-frame-indicators">
            <svg className="phone-frame-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 22h20V2L2 22z" />
            </svg>
            <svg className="phone-frame-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 4h3v16h-3zM5 14h2v6H5zM10 7h2v13h-2zM14 10h2v10h-2z" />
            </svg>
            <div className="phone-frame-battery">
              <span>87%</span>
              <div className="phone-frame-battery-icon">
                <div className="phone-frame-battery-level" style={{ width: '87%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="phone-frame-screen">{children}</div>

        <div className="phone-frame-home-indicator" />
      </div>

      <style>{`
        .phone-frame-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
        }

        .phone-frame {
          position: relative;
          width: 375px;
          height: 812px;
          border-radius: 54px;
          padding: 12px;
          box-shadow:
            0 0 0 3px #1a1a1a,
            0 0 0 6px #2a2a2a,
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            inset 0 0 0 1px rgba(255, 255, 255, 0.1);
          background: #1a1a1a;
          overflow: hidden;
        }

        .phone-frame::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 30px;
          background: #1a1a1a;
          border-radius: 0 0 20px 20px;
          z-index: 10;
        }

        .phone-frame-notch {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 34px;
          background: #000;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
        }

        .phone-frame-speaker {
          width: 50px;
          height: 6px;
          background: #1a1a1a;
          border-radius: 3px;
        }

        .phone-frame-status-bar {
          position: absolute;
          top: 56px;
          left: 24px;
          right: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 20;
        }

        .phone-frame-time {
          font-size: 15px;
          font-weight: 600;
          color: #fff;
        }

        .phone-frame-indicators {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .phone-frame-icon {
          width: 16px;
          height: 16px;
          color: #fff;
        }

        .phone-frame-battery {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .phone-frame-battery span {
          font-size: 12px;
          font-weight: 600;
          color: #fff;
        }

        .phone-frame-battery-icon {
          width: 24px;
          height: 12px;
          border: 1.5px solid #fff;
          border-radius: 3px;
          padding: 1px;
          position: relative;
        }

        .phone-frame-battery-icon::after {
          content: '';
          position: absolute;
          right: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 2px;
          height: 6px;
          background: #fff;
          border-radius: 0 1px 1px 0;
        }

        .phone-frame-battery-level {
          height: 100%;
          background: #fff;
          border-radius: 1px;
          transition: width 0.3s;
        }

        .phone-frame-screen {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          bottom: 12px;
          border-radius: 42px;
          overflow: hidden;
          background: #000;
        }

        .phone-frame-home-indicator {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 134px;
          height: 5px;
          background: #fff;
          border-radius: 3px;
          opacity: 0.3;
          z-index: 20;
        }

        @media (max-width: 420px) {
          .phone-frame-container {
            padding: 20px 10px;
          }
          .phone-frame {
            transform: scale(0.85);
          }
        }

        @media (max-width: 360px) {
          .phone-frame {
            transform: scale(0.75);
          }
        }
      `}</style>
    </div>
  )
}
