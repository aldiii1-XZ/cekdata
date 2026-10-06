/**
 * Inti pemeriksaan kualitas CSV.
 *
 * Semua fungsi di berkas ini MURNI (tidak menyentuh DOM / jaringan) supaya
 * mudah diuji. Seluruh proses berjalan di browser — isi CSV tidak pernah
 * dikirim ke server.
 */
import Papa from 'papaparse'

/** Hasil pembacaan berkas CSV mentah. */
export interface HasilBaca {
  /** Nama-nama kolom (baris pertama). */
  kolom: string[]
  /** Baris data (tanpa baris judul), masing-masing berupa larik sel. */
  baris: string[][]
  /** Galat yang dilaporkan pengurai (mis. kutip tidak ditutup). */
  galatParsing: string[]
  /** true bila berkas tidak punya baris judul / kosong. */
  kosong: boolean
}

export type JenisMasalah =
  | 'sel-kosong'
  | 'wajib-kosong'
  | 'duplikat'
  | 'kolom-tak-sesuai'
  | 'spasi-berlebih'
  | 'galat-parsing'

export interface Masalah {
  jenis: JenisMasalah
  /** Nomor baris data (1 = data pertama). null bila berlaku untuk seluruh kolom. */
  baris: number | null
  /** Nama kolom terkait, bila ada. */
  kolom: string | null
  pesan: string
}

export interface OpsiPeriksa {
  /** Kolom yang wajib terisi. */
  kolomWajib: string[]
  /** Periksa sel yang punya spasi di awal/akhir. */
  periksaSpasi: boolean
  /** Periksa baris yang isinya sama persis. */
  periksaDuplikat: boolean
}

export interface Ringkasan {
  jumlahBaris: number
  jumlahKolom: number
  kolom: string[]
  masalah: Masalah[]
  /** Jumlah masalah per jenis. */
  hitung: Record<JenisMasalah, number>
  /** Skor kualitas 0–100. */
  skor: number
  /** Jumlah sel yang terisi (bukan kosong). */
  selTerisi: number
  /** Jumlah total sel. */
  selTotal: number
}

/** Batas yang disepakati untuk MVP. */
export const BATAS_UKURAN_BYTE = 2 * 1024 * 1024 // 2 MB
export const BATAS_BARIS = 5000
export const PRATINJAU_BARIS = 50

/**
 * Baca teks CSV menjadi kolom + baris.
 * Menggunakan Papa Parse agar aman terhadap kutip, koma di dalam sel, dan baris baru di dalam sel.
 */
export function bacaCsv(teks: string): HasilBaca {
  // skipEmptyLines dimatikan agar baris berisi pemisah kosong (mis. ",,") TETAP
  // terbaca — baris seperti itu justru masalah yang harus terdeteksi.
  const hasil = Papa.parse<string[]>(teks.trim(), {
    skipEmptyLines: false,
  })

  const galatParsing = hasil.errors.map((e) => {
    const baris = typeof e.row === 'number' ? ` (baris ${e.row + 1})` : ''
    return `${e.message}${baris}`
  })

  // Buang HANYA baris kosong murni (satu sel berisi teks kosong), yaitu sisa
  // dari baris kosong di berkas. Baris berisi ",," (banyak sel kosong) dipertahankan.
  const data = (hasil.data || [])
    .filter((r) => Array.isArray(r))
    .filter((r) => !(r.length === 1 && String(r[0] ?? '').trim() === ''))

  if (data.length === 0) {
    return { kolom: [], baris: [], galatParsing, kosong: true }
  }

  const kolom = data[0].map((k, i) => {
    const nama = String(k ?? '').trim()
    return nama === '' ? `kolom_${i + 1}` : nama
  })

  // Baris data dibiarkan apa adanya (tanpa padding) agar baris "bergerigi"
  // — yang jumlah selnya tidak sama dengan jumlah kolom — tetap terdeteksi.
  const baris = data.slice(1).map((r) => r.map((s) => String(s ?? '')))

  return { kolom, baris, galatParsing, kosong: kolom.length === 0 }
}

const normalSel = (s: string) => s.trim().toLowerCase()

/**
 * Periksa kualitas data dan kembalikan daftar masalah.
 */
export function periksa(
  kolom: string[],
  baris: string[][],
  opsi: OpsiPeriksa,
  galatParsing: string[] = []
): Masalah[] {
  const masalah: Masalah[] = []

  // 0. Galat parsing dari pengurai
  for (const g of galatParsing) {
    masalah.push({ jenis: 'galat-parsing', baris: null, kolom: null, pesan: g })
  }

  // 1. Jumlah kolom tidak sesuai (baris "bergerigi")
  baris.forEach((r, i) => {
    if (r.length !== kolom.length) {
      masalah.push({
        jenis: 'kolom-tak-sesuai',
        baris: i + 1,
        kolom: null,
        pesan: `Baris ${i + 1} punya ${r.length} sel, seharusnya ${kolom.length} kolom`,
      })
    }
  })

  // 2. Sel kosong per kolom
  kolom.forEach((nama, c) => {
    let kosong = 0
    baris.forEach((r) => {
      if (r.length > c && String(r[c] ?? '').trim() === '') kosong++
    })
    if (kosong > 0) {
      masalah.push({
        jenis: 'sel-kosong',
        baris: null,
        kolom: nama,
        pesan: `Kolom "${nama}" punya ${kosong} sel kosong`,
      })
    }
  })

  // 3. Kolom wajib yang kosong (dilaporkan per baris agar bisa ditindaklanjuti)
  if (opsi.kolomWajib.length > 0) {
    const indeksWajib = opsi.kolomWajib
      .map((n) => kolom.indexOf(n))
      .filter((i) => i >= 0)
    baris.forEach((r, i) => {
      for (const c of indeksWajib) {
        if (String(r[c] ?? '').trim() === '') {
          masalah.push({
            jenis: 'wajib-kosong',
            baris: i + 1,
            kolom: kolom[c],
            pesan: `Baris ${i + 1}: kolom wajib "${kolom[c]}" masih kosong`,
          })
        }
      }
    })
  }

  // 4. Spasi berlebih di awal/akhir sel
  if (opsi.periksaSpasi) {
    baris.forEach((r, i) => {
      r.forEach((sel, c) => {
        const asli = String(sel ?? '')
        if (asli !== '' && asli !== asli.trim()) {
          masalah.push({
            jenis: 'spasi-berlebih',
            baris: i + 1,
            kolom: kolom[c] ?? `kolom_${c + 1}`,
            pesan: `Baris ${i + 1}: sel pada kolom "${kolom[c] ?? c + 1}" punya spasi berlebih`,
          })
        }
      })
    })
  }

  // 5. Baris duplikat (isi sama persis)
  if (opsi.periksaDuplikat) {
    const peta = new Map<string, number>()
    baris.forEach((r, i) => {
      const kunci = r.map(normalSel).join('\u0001')
      if (kunci.replace(/\u0001/g, '') === '') return // baris kosong diabaikan
      if (peta.has(kunci)) {
        masalah.push({
          jenis: 'duplikat',
          baris: i + 1,
          kolom: null,
          pesan: `Baris ${i + 1} sama persis dengan baris ${peta.get(kunci)}`,
        })
      } else {
        peta.set(kunci, i + 1)
      }
    })
  }

  return masalah
}

/** Hitung ringkasan + skor kualitas dari daftar masalah. */
export function ringkas(
  kolom: string[],
  baris: string[][],
  masalah: Masalah[]
): Ringkasan {
  const hitung = {
    'sel-kosong': 0,
    'wajib-kosong': 0,
    duplikat: 0,
    'kolom-tak-sesuai': 0,
    'spasi-berlebih': 0,
    'galat-parsing': 0,
  } as Record<JenisMasalah, number>
  for (const m of masalah) hitung[m.jenis]++

  const selTotal = kolom.length * baris.length
  let selTerisi = 0
  baris.forEach((r) => {
    for (let c = 0; c < kolom.length; c++) {
      if (String(r[c] ?? '').trim() !== '') selTerisi++
    }
  })

  // Skor: mulai 100, kurangi menurut bobot tiap jenis (dibatasi 0–100).
  const bobot: Record<JenisMasalah, number> = {
    'galat-parsing': 12,
    'kolom-tak-sesuai': 6,
    'wajib-kosong': 3,
    'sel-kosong': 0.5,
    duplikat: 2,
    'spasi-berlebih': 0.3,
  }
  let penalti = 0
  for (const jenis of Object.keys(hitung) as JenisMasalah[]) {
    penalti += hitung[jenis] * bobot[jenis]
  }
  const skor = baris.length === 0 ? 0 : Math.max(0, Math.min(100, Math.round(100 - penalti)))

  return {
    jumlahBaris: baris.length,
    jumlahKolom: kolom.length,
    kolom,
    masalah,
    hitung,
    skor,
    selTerisi,
    selTotal,
  }
}

/** Label ringkas tiap jenis masalah (untuk tampilan & laporan). */
export const LABEL_JENIS: Record<JenisMasalah, string> = {
  'sel-kosong': 'Sel kosong',
  'wajib-kosong': 'Kolom wajib kosong',
  duplikat: 'Baris duplikat',
  'kolom-tak-sesuai': 'Jumlah kolom tak sesuai',
  'spasi-berlebih': 'Spasi berlebih',
  'galat-parsing': 'Galat parsing',
}

/** Buat isi laporan teks (untuk diunduh sebagai .txt). */
export function buatLaporan(ringkasan: Ringkasan, namaBerkas: string): string {
  const g = (n: number) => n.toLocaleString('id-ID')
  const baris: string[] = []
  baris.push('LAPORAN KUALITAS DATA — CEKDATA')
  baris.push(`Berkas     : ${namaBerkas}`)
  baris.push(`Waktu      : ${new Date().toLocaleString('id-ID')}`)
  baris.push(`Jumlah     : ${g(ringkasan.jumlahBaris)} baris x ${g(ringkasan.jumlahKolom)} kolom`)
  baris.push(`Sel terisi : ${g(ringkasan.selTerisi)} dari ${g(ringkasan.selTotal)}`)
  baris.push(`Skor       : ${ringkasan.skor}/100`)
  baris.push('')
  baris.push('RINGKASAN MASALAH')
  for (const jenis of Object.keys(ringkasan.hitung) as JenisMasalah[]) {
    baris.push(`- ${LABEL_JENIS[jenis]}: ${g(ringkasan.hitung[jenis])}`)
  }
  baris.push('')
  baris.push('RINCIAN')
  if (ringkasan.masalah.length === 0) {
    baris.push('- Tidak ada masalah yang terdeteksi.')
  } else {
    ringkasan.masalah.forEach((m, i) => {
      baris.push(`${i + 1}. [${LABEL_JENIS[m.jenis]}] ${m.pesan}`)
    })
  }
  baris.push('')
  baris.push('Catatan: seluruh pemeriksaan dilakukan di browser. Isi berkas tidak dikirim ke server.')
  return baris.join('\n')
}
