'use client'
import { Key, useEffect, useMemo, useRef, useState } from 'react'
import { faCircleDown, faCirclePause, faCirclePlay } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@nextui-org/button'
import { Textarea } from '@nextui-org/input'
import { base64AudioToBlobUrl, filterAndDeduplicateByGender, saveAs } from '../../lib/tools'
import { ListItem } from '../../lib/types'
import LanguageSelect from './components/language-select'
import { type getDictionary } from '@/get-dictionary'

export default function Content({ t, list }: { t: Awaited<ReturnType<typeof getDictionary>>; list: ListItem[] }) {
  const [input, setInput] = useState('我当时就心跳加速了，收到了重点大学的录取通知书，我太开心了')
  const [isLoading, setLoading] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cacheConfigRef = useRef<string | null>(null)
  const [config, setConfig] = useState({
    gender: 'Female',
    voiceName: '',
    lang: 'zh-CN',
    style: '',
    role: '',
  })

  const langs = useMemo(() => {
    const map = new Map()
    list.forEach(item => {
      map.set(item.Locale, item.LocaleName)
    })
    return [...map].map(([value, label]) => ({ label, value }))
  }, [list])

  const selectedConfigs = useMemo(() => {
    return list.filter(item => item.Locale === config.lang)
  }, [list, config])

  const genders = useMemo(() => {
    return filterAndDeduplicateByGender(selectedConfigs)
  }, [selectedConfigs])

  const voiceNames = useMemo(() => {
    const dataForVoiceName = selectedConfigs.filter(item => item.Gender === config.gender)
    return dataForVoiceName.map(item => ({ label: item.LocalName, value: item.ShortName }))
  }, [config, selectedConfigs])

  const { styles, roles } = useMemo(() => {
    const data = selectedConfigs.find(item => item.ShortName === config.voiceName)
    const { StyleList = [], RolePlayList = [] } = data || {}
    return { styles: StyleList, roles: RolePlayList }
  }, [config, selectedConfigs])

  const handleSelectGender = (e: React.MouseEvent<HTMLButtonElement>, gender: string) => {
    setConfig(prevConfig => ({ ...prevConfig, gender }))
  }

  const handleSelectLang = (value: Key | null) => {
    if (!value) return
    const lang = value.toString()
    setConfig(prevConfig => ({ ...prevConfig, lang }))
    window.localStorage.setItem('lang', lang)
  }

  const handleSelectVoiceName = (voiceName: string) => {
    setConfig(prevConfig => ({ ...prevConfig, voiceName, style: '', role: '' }))
  }

  useEffect(() => {
    if (typeof window !== undefined) {
      const browserLang = window.localStorage.getItem('browserLang') === 'cn' ? 'zh-CN' : 'en-US'
      const lang = window.localStorage.getItem('lang') || browserLang || 'zh-CN'
      setConfig(prevConfig => ({ ...prevConfig, lang }))
    }
  }, [list])

  // set default voice name
  useEffect(() => {
    if (voiceNames.length && !config.voiceName) {
      handleSelectVoiceName(voiceNames[0].value)
    }
  }, [voiceNames, config.voiceName])

  const fetchAudio = async () => {
    const res = await fetch('/api/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, config }),
    })
    return res.json()
  }

  const play = async () => {
    if (!input.length || isLoading) return
    const cacheString = getCacheMark()
    if (cacheConfigRef.current === cacheString) {
      setIsPlaying(true)
      audioRef.current?.play()
      return
    }
    audioRef.current = null
    setLoading(true)

    try {
      const { base64Audio } = await fetchAudio()
      const url = base64AudioToBlobUrl(base64Audio)
      if (!audioRef.current) {
        audioRef.current = new Audio(url)
        audioRef.current.onended = () => {
          setIsPlaying(false)
        }
      }
      setIsPlaying(true)
      audioRef.current?.play()
      // save cache mark
      cacheConfigRef.current = cacheString
    } catch (err) {
      console.error('Error fetching audio:', err)
    } finally {
      setLoading(false)
    }
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }

  const handleDownload = async () => {
    if (!audioRef.current || !audioRef.current.src) return
    const response = await fetch(audioRef.current.src)
    const blob = await response.blob()
    saveAs(blob, new Date().toISOString().replace('T', ' ').replace(':', '_').split('.')[0] + '.mp3')
  }

  const getCacheMark = () => {
    return input + config.gender + config.voiceName + config.lang + config.style + config.role
  }

  return (
    <div className="grow overflow-y-auto flex md:justify-center gap-10 py-5 px-6 sm:px-10 md:px-10 lg:px-20 xl:px-40 2xl:px-50 flex-col md:flex-row">
      <div className="md:flex-1">
        <Textarea
          size="lg"
          disableAutosize
          classNames={{
            input: 'resize-y min-h-[120px]',
          }}
          placeholder={t['input-text']}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <p className="text-right pt-2">{input.length}/7000</p>
        <div className="flex justify-between items-center pt-6">
          <FontAwesomeIcon
            icon={faCircleDown}
            className="w-8 h-8 text-blue-600 cursor-pointer"
            onClick={handleDownload}
          />
          <FontAwesomeIcon
            icon={isPlaying ? faCirclePause : faCirclePlay}
            className={`w-8 h-8 text-blue-${isLoading ? '600/50' : '600'} cursor-pointer`}
            onClick={isPlaying ? pause : play}
          />
        </div>
      </div>

      <div className="md:flex-1 flex flex-col">
        <LanguageSelect t={t} langs={langs} selectedLang={config.lang} handleSelectLang={handleSelectLang} />
        <div className="pt-4 flex gap-2">
          {genders.map(
            item =>
              item.show && (
                <Button
                  color={config.gender === item.value ? 'primary' : 'default'}
                  onClick={e => handleSelectGender(e, item.value)}
                  key={item.value}
                >
                  {t[item.label]}
                </Button>
              ),
          )}
        </div>

        {/* voice */}
        <div className="pt-10">
          {langs.length ? <p>{t.voice}</p> : null}
          <div className="flex flex-wrap gap-2">
            {voiceNames.map(item => {
              return (
                <Button
                  key={item.value}
                  color={item.value === config.voiceName ? 'primary' : 'default'}
                  className="mt-2"
                  onClick={() => handleSelectVoiceName(item.value)}
                >
                  {item.label.split(' ').join(' - ')}
                </Button>
              )
            })}
          </div>
        </div>

        {/* style */}
        {config.voiceName && (
          <div className="pt-10">
            <p>{t.style}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                key="defaultStyle"
                color={config.style === '' ? 'primary' : 'default'}
                className="mt-2"
                onClick={() => setConfig(prevConfig => ({ ...prevConfig, style: '' }))}
              >
                {t.default}
              </Button>
              {styles.map(item => {
                return (
                  <Button
                    key={item}
                    color={item === config.style ? 'primary' : 'default'}
                    className="mt-2"
                    onClick={() => setConfig(prevConfig => ({ ...prevConfig, style: item }))}
                  >
                    {t.styles[item]}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* role */}
        {config.voiceName && (
          <div className="pt-10">
            <p>{t.role}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                key="defaultRole"
                color={config.role === '' ? 'primary' : 'default'}
                className="mt-2"
                onClick={() => setConfig(prevConfig => ({ ...prevConfig, role: '' }))}
              >
                {t.default}
              </Button>
              {roles.map(item => {
                return (
                  <Button
                    key={item}
                    color={item === config.role ? 'primary' : 'default'}
                    className="mt-2"
                    onClick={() => setConfig(prevConfig => ({ ...prevConfig, role: item }))}
                  >
                    {t.roles[item]}
                  </Button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
