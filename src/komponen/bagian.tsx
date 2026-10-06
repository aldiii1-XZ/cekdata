/** Komponen-komponen tampilan CEKDATA. */
import { useRef, useState } from 'react'

import {
  BATAS_BARIS,
  BATAS_UKURAN_BYTE,
  LABEL_JENIS,
  PRATINJAU_BARIS,
  type JenisMasalah,
  type OpsiPeriksa,
  type Ringkasan,
} from '../lib/periksa'

const formatAngka = (n: number) => n.toLocaleString('id-ID')

/* ------------------------------------------------------------------ */
/* Area unggah                                                         */
/* ------------------------------------------------------------------ */
export function AreaUnggah({
  onBerkas,
  onContoh,
}: {
  onBerkas: (f: File) => void
  onContoh: () => void
}) {
  const [aktif, setAktif] = useState(false)
  const inp = useRef<HTMLInputElement>(null)

  return (
    <div className="kartu">
      <h2>1. Pilih berkas CSV</h2>
      <p className="ket">
        Berkas diperiksa langsung di peramban — isinya <strong>tidak pernah dikirim ke server</strong>.
      </p>

      <div
        className={'unggah' + (aktif ? ' aktif' : '')}
        onClick={() => inp.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setAktif(true)
        }}
        onDragLeave={() => setAktif(false)}
        onDrop={(e) => {
          e.preventDefault()
          setAktif(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onBerkas(f)
        }}
      >
        <strong>Klik untuk memilih berkas</strong>
        <span>atau tarik &amp; lepas berkas .csv ke sini</span>
        <span style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          Batas MVP: maks. {(BATAS_UKURAN_BYTE / 1024 / 1024).toFixed(0)} MB &amp;{' '}
          {formatAngka(BATAS_BARIS)} baris
        </span>
      </div>

      <input
        ref={inp}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onBerkas(f)
          e.target.value = ''
        }}
      />

      <div className="baris-tombol">
        <button className="tombol sekunder" onClick={onContoh}>
          Pakai contoh CSV bermasalah
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Panel opsi pemeriksaan                                              */
/* ------------------------------------------------------------------ */
export function PanelOpsi({
  kolom,
  opsi,
  onUbah,
}: {
  kolom: string[]
  opsi: OpsiPeriksa
  onUbah: (o: OpsiPeriksa) => void
}) {
  const balik = (nama: keyof OpsiPeriksa) =>
    onUbah({ ...opsi, [nama]: !opsi[nama] } as OpsiPeriksa)

  const balikKolom = (k: string) =>
    onUbah({
      ...opsi,
      kolomWajib: opsi.kolomWajib.includes(k)
        ? opsi.kolomWajib.filter((x) => x !== k)
        : [...opsi.kolomWajib, k],
    })

  return (
    <div className="kartu">
      <h2>2. Atur pemeriksaan</h2>
      <p className="ket">Pilih pemeriksaan yang ingin dijalankan.</p>

      <div className="opsi-baris">
        <label className="centang">
          <input
            type="checkbox"
            checked={opsi.periksaSpasi}
            onChange={() => balik('periksaSpasi')}
          />
          Periksa spasi berlebih
        </label>
        <label className="centang">
          <input
            type="checkbox"
            checked={opsi.periksaDuplikat}
            onChange={() => balik('periksaDuplikat')}
          />
          Periksa baris duplikat
        </label>
      </div>

      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 13.5, marginBottom: 6 }}>
          Kolom wajib terisi <span style={{ color: 'var(--redup)' }}>(klik untuk menandai)</span>
        </div>
        <div className="kolom-wajib">
          {kolom.map((k) => (
            <button
              key={k}
              className={'pil' + (opsi.kolomWajib.includes(k) ? ' aktif' : '')}
              onClick={() => balikKolom(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ringkasan hasil                                                     */
/* ------------------------------------------------------------------ */
export function PanelRingkasan({
  ringkasan,
  namaBerkas,
  onUnduh,
}: {
  ringkasan: Ringkasan
  namaBerkas: string
  onUnduh: () => void
}) {
  const warna = (s: number) => (s >= 85 ? 'var(--hijau)' : s >= 60 ? 'var(--kuning)' : 'var(--merah)')
  const nilai = (s: number) => `${s}`

  return (
    <div className="kartu">
      <h2>3. Hasil pemeriksaan</h2>
      <p className="ket">
        Berkas: <strong>{namaBerkas}</strong>
      </p>

      <div className="skor-bulat" style={{ marginBottom: 14 }}>
        <div
          className="cincin"
          style={{
            border: `4px solid ${warna(ringkasan.skor)}`,
            color: warna(ringkasan.skor),
          }}
        >
          {nilai(ringkasan.skor)}
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>Skor kualitas</div>
          <div style={{ color: 'var(--redup)', fontSize: 13 }}>
            {ringkasan.skor >= 85
              ? 'Data cukup bersih'
              : ringkasan.skor >= 60
                ? 'Ada beberapa masalah'
                : 'Banyak masalah terdeteksi'}
          </div>
        </div>
      </div>

      <div className="peti-ringkas">
        <div className="kotak">
          <div className="angka">{formatAngka(ringkasan.jumlahBaris)}</div>
          <div className="label">Baris data</div>
        </div>
        <div className="kotak">
          <div className="angka">{formatAngka(ringkasan.jumlahKolom)}</div>
          <div className="label">Kolom</div>
        </div>
        <div className="kotak">
          <div className="angka">
            {formatAngka(ringkasan.selTerisi)}
            <span style={{ fontSize: 13, color: 'var(--redup)' }}>
              /{formatAngka(ringkasan.selTotal)}
            </span>
          </div>
          <div className="label">Sel terisi</div>
        </div>
        <div className="kotak">
          <div className="angka" style={{ color: ringkasan.masalah.length ? 'var(--merah)' : 'var(--hijau)' }}>
            {formatAngka(ringkasan.masalah.length)}
          </div>
          <div className="label">Masalah</div>
        </div>
      </div>

      <div className="baris-tombol">
        <button className="tombol" onClick={onUnduh}>
          Unduh laporan (.txt)
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Daftar masalah                                                      */
/* ------------------------------------------------------------------ */
export function PanelMasalah({ ringkasan }: { ringkasan: Ringkasan }) {
  if (ringkasan.masalah.length === 0) {
    return (
      <div className="kartu">
        <h2>Rincian masalah</h2>
        <div className="pesan info" style={{ color: 'var(--hijau)', borderColor: 'rgba(104,211,145,.4)', background: 'rgba(104,211,145,.1)' }}>
          Tidak ada masalah yang terdeteksi dengan pengaturan saat ini.
        </div>
      </div>
    )
  }

  const jenisAda = (Object.keys(ringkasan.hitung) as JenisMasalah[]).filter(
    (j) => ringkasan.hitung[j] > 0
  )

  return (
    <div className="kartu">
      <h2>Rincian masalah ({formatAngka(ringkasan.masalah.length)})</h2>
      <p className="ket">Daftar berikut menunjukkan letak setiap masalah.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {jenisAda.map((j) => (
          <span key={j} className={'tanda t-' + j}>
            {LABEL_JENIS[j]}: {formatAngka(ringkasan.hitung[j])}
          </span>
        ))}
      </div>

      <div className="daftar-masalah">
        {ringkasan.masalah.map((m, i) => (
          <div className="baris-masalah" key={i}>
            <span className={'tanda t-' + m.jenis}>{LABEL_JENIS[m.jenis]}</span>
            <span>{m.pesan}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pratinjau tabel                                                     */
/* ------------------------------------------------------------------ */
export function PanelPratinjau({
  kolom,
  baris,
}: {
  kolom: string[]
  baris: string[][]
}) {
  const tampil = baris.slice(0, PRATINJAU_BARIS)
  return (
    <div className="kartu">
      <h2>Pratinjau data</h2>
      <p className="ket">
        Menampilkan {formatAngka(tampil.length)} dari {formatAngka(baris.length)} baris. Sel kosong
        ditandai.
      </p>
      <div className="gulir">
        <table>
          <thead>
            <tr>
              <th style={{ width: 46 }}>#</th>
              {kolom.map((k, i) => (
                <th key={i}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tampil.map((r, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--redup)' }}>{i + 1}</td>
                {kolom.map((_, c) => {
                  const sel = r[c]
                  const kosong = sel === undefined || String(sel).trim() === ''
                  return (
                    <td key={c} className={kosong ? 'kosong' : undefined}>
                      {kosong ? '' : sel}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ikon garis (SVG) — konsisten, tanpa emoji                           */
/* ------------------------------------------------------------------ */
export function IkonGembok({ ukuran = 14 }: { ukuran?: number }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-2px' }}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Kaki halaman                                                        */
/* ------------------------------------------------------------------ */
export function Kaki() {
  return (
    <div className="kaki">
      <div className="aman">
        <IkonGembok /> Seluruh pemeriksaan berjalan di peramban Anda
      </div>
      <div style={{ marginTop: 6 }}>
        CEKDATA — dibuat oleh{' '}
        <a href="https://aldiyonatan.vercel.app" target="_blank" rel="noreferrer">
          Aldi Yonatan Rusnawan
        </a>{' '}
        ·{' '}
        <a href="https://github.com/aldiii1-XZ/cekdata" target="_blank" rel="noreferrer">
          Kode sumber
        </a>
      </div>
    </div>
  )
}
