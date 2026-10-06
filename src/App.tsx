import { useMemo, useState } from 'react'

import {
  AreaUnggah,
  IkonGembok,
  Kaki,
  PanelMasalah,
  PanelOpsi,
  PanelPratinjau,
  PanelRingkasan,
} from './komponen/bagian'
import {
  BATAS_BARIS,
  BATAS_UKURAN_BYTE,
  bacaCsv,
  buatLaporan,
  periksa,
  ringkas,
  type HasilBaca,
  type OpsiPeriksa,
} from './lib/periksa'

/** CSV contoh yang sengaja dibuat bermasalah, untuk mencoba tanpa berkas sendiri. */
const CONTOH_CSV = `nama,email,usia,kota
Andi Pratama,andi@mail.com,20,Palembang
Budi Santoso,,25,Prabumulih
 Andi Pratama ,andi@mail.com,20,Palembang
Citra Dewi,citra@mail.com,,Palembang
Dewi Lestari,dewi@mail.com,22
Eka Saputra,eka@mail.com,19,"Banyuasin, Sumsel"
Budi Santoso,,25,Prabumulih`

const OPSI_AWAL: OpsiPeriksa = {
  kolomWajib: ['email'],
  periksaSpasi: true,
  periksaDuplikat: true,
}

export default function App() {
  const [hasil, setHasil] = useState<HasilBaca | null>(null)
  const [namaBerkas, setNamaBerkas] = useState('')
  const [opsi, setOpsi] = useState<OpsiPeriksa>(OPSI_AWAL)
  const [galat, setGalat] = useState('')

  const ringkasan = useMemo(() => {
    if (!hasil) return null
    const masalah = periksa(hasil.kolom, hasil.baris, opsi, hasil.galatParsing)
    return ringkas(hasil.kolom, hasil.baris, masalah)
  }, [hasil, opsi])

  /** Baca & validasi berkas yang dipilih pengguna. */
  async function tanganiBerkas(f: File) {
    setGalat('')
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') {
      setGalat('Berkas harus berformat .csv')
      return
    }
    if (f.size > BATAS_UKURAN_BYTE) {
      setGalat(
        `Ukuran berkas ${(f.size / 1024 / 1024).toFixed(1)} MB melebihi batas ` +
          `${(BATAS_UKURAN_BYTE / 1024 / 1024).toFixed(0)} MB.`
      )
      return
    }

    const teks = await f.text()
    const h = bacaCsv(teks)

    if (h.kosong || h.kolom.length === 0) {
      setGalat('Berkas kosong atau tidak memiliki baris judul.')
      setHasil(null)
      return
    }
    if (h.baris.length > BATAS_BARIS) {
      setGalat(
        `Jumlah baris (${h.baris.length.toLocaleString('id-ID')}) melebihi batas ` +
          `${BATAS_BARIS.toLocaleString('id-ID')}.`
      )
      setHasil(null)
      return
    }

    setHasil(h)
    setNamaBerkas(f.name)
    // kolom wajib awal: bersihkan yang tidak ada di berkas ini
    setOpsi((o) => ({ ...o, kolomWajib: o.kolomWajib.filter((k) => h.kolom.includes(k)) }))
  }

  function pakaiContoh() {
    const f = new File([CONTOH_CSV], 'contoh-data-bermasalah.csv', { type: 'text/csv' })
    void tanganiBerkas(f)
  }

  function unduh() {
    if (!ringkasan) return
    const isi = buatLaporan(ringkasan, namaBerkas)
    const blob = new Blob([isi], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'laporan-cekdata.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    setHasil(null)
    setNamaBerkas('')
    setGalat('')
    setOpsi(OPSI_AWAL)
  }

  return (
    <div className="wadah">
      <div className="kepala">
        <div className="logo">C</div>
        <div>
          <h1 className="judul">CEKDATA</h1>
          <p className="sub">Periksa kualitas berkas CSV sebelum diolah — langsung di peramban.</p>
        </div>
        <div className="lencana">
          <IkonGembok ukuran={12} /> 100% lokal
        </div>
      </div>

      {galat && <div className="pesan galat">{galat}</div>}

      {!hasil && <AreaUnggah onBerkas={tanganiBerkas} onContoh={pakaiContoh} />}

      {hasil && ringkasan && (
        <>
          <PanelRingkasan ringkasan={ringkasan} namaBerkas={namaBerkas} onUnduh={unduh} />
          <PanelOpsi kolom={hasil.kolom} opsi={opsi} onUbah={setOpsi} />
          <PanelMasalah ringkasan={ringkasan} />
          <PanelPratinjau kolom={hasil.kolom} baris={hasil.baris} />
          <div className="baris-tombol">
            <button className="tombol sekunder" onClick={reset}>
              Periksa berkas lain
            </button>
          </div>
        </>
      )}

      <Kaki />
    </div>
  )
}
