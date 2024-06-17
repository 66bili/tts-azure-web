import { Key } from 'react'
import { getLocale } from '@/get-locale'

export interface ListItem {
  Name: string
  DisplayName: string
  LocalName: string
  ShortName: string
  Gender: string
  Locale: string
  LocaleName: string
  StyleList?: string[]
  SampleRateHertz: string
  VoiceType: string
  Status: string
  ExtendedPropertyMap?: ExtendedPropertyMap
  WordsPerMinute: string
  SecondaryLocaleList?: string[]
  RolePlayList?: string[]
}

interface ExtendedPropertyMap {
  IsHighQuality48K: string
}

export interface Config {
  gender: string
  voiceName: string
  lang: string
  style: string
  styleDegree: number
  role: string
  rate: number
  volume: number
  pitch: number
}

interface KeyValue {
  label: string
  value: string
}

export interface GenderResult extends KeyValue {
  show: boolean
}

export interface LangsItem extends KeyValue {}

export type Tran = Awaited<ReturnType<typeof getLocale>>

export interface LanguageSelectProps {
  t: Tran
  langs: LangsItem[]
  selectedLang: string
  handleSelectLang: (value: Key | null) => void
}
