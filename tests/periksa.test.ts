/**
 * Tes inti pemeriksaan CSV — memastikan deteksi masalah akurat.
 */
import { describe, expect, it } from 'vitest'

import { bacaCsv, periksa, ringkas, buatLaporan, type OpsiPeriksa } from '../src/lib/periksa'

const opsiDasar: OpsiPeriksa = {
  kolomWajib: [],
  periksaSpasi: false,
  periksaDuplikat: false,
}

describe('bacaCsv', () => {
  it('membaca kolom dan baris dengan benar', () => {
    const h = bacaCsv('nama,umur\nAndi,20\nBudi,21')
    expect(h.kolom).toEqual(['nama', 'umur'])
    expect(h.baris).toEqual([
      ['Andi', '20'],
      ['Budi', '21'],
    ])
    expect(h.kosong).toBe(false)
  })

  it('aman terhadap koma dan kutip di dalam sel', () => {
    const h = bacaCsv('nama,alamat\n"Wati","Jl. Merdeka, No. 5"\n"Sari","Kata ""penting"""')
    expect(h.kolom).toEqual(['nama', 'alamat'])
    expect(h.baris[0]).toEqual(['Wati', 'Jl. Merdeka, No. 5'])
    expect(h.baris[1]).toEqual(['Sari', 'Kata "penting"'])
  })

  it('menandai berkas kosong', () => {
    expect(bacaCsv('').kosong).toBe(true)
    expect(bacaCsv('   ').kosong).toBe(true)
  })

  it('memberi nama pengganti untuk kolom tanpa judul', () => {
    const h = bacaCsv('nama,,umur\nA,1,2')
    expect(h.kolom).toEqual(['nama', 'kolom_2', 'umur'])
  })

  it('mengabaikan baris kosong di tengah', () => {
    const h = bacaCsv('a,b\n1,2\n\n3,4')
    expect(h.baris).toEqual([
      ['1', '2'],
      ['3', '4'],
    ])
  })
})

describe('periksa — sel kosong', () => {
  it('mendeteksi sel kosong per kolom', () => {
    const { kolom, baris } = bacaCsv('nama,umur\nAndi,20\nBudi,\nCitra,22')
    const m = periksa(kolom, baris, opsiDasar)
    const kosong = m.filter((x) => x.jenis === 'sel-kosong')
    expect(kosong).toHaveLength(1)
    expect(kosong[0].kolom).toBe('umur')
    expect(kosong[0].pesan).toContain('1 sel kosong')
  })

  it('tidak melaporkan apa pun bila data bersih', () => {
    const { kolom, baris } = bacaCsv('nama,umur\nAndi,20\nBudi,21')
    expect(periksa(kolom, baris, opsiDasar)).toHaveLength(0)
  })
})

describe('periksa — kolom wajib', () => {
  it('melaporkan setiap baris yang kolom wajibnya kosong', () => {
    const { kolom, baris } = bacaCsv('nama,email\nAndi,a@x.com\nBudi,\nCitra,c@x.com')
    const m = periksa(kolom, baris, { ...opsiDasar, kolomWajib: ['email'] })
    const wajib = m.filter((x) => x.jenis === 'wajib-kosong')
    expect(wajib).toHaveLength(1)
    expect(wajib[0].baris).toBe(2)
    expect(wajib[0].kolom).toBe('email')
  })

  it('mendukung beberapa kolom wajib sekaligus', () => {
    const { kolom, baris } = bacaCsv('nama,email\n,\nBudi,b@x.com')
    const m = periksa(kolom, baris, { ...opsiDasar, kolomWajib: ['nama', 'email'] })
    expect(m.filter((x) => x.jenis === 'wajib-kosong')).toHaveLength(2)
  })
})

describe('periksa — duplikat', () => {
  it('mendeteksi baris yang sama persis', () => {
    const { kolom, baris } = bacaCsv('nama,kota\nAndi,Palembang\nBudi,Palembang\nAndi,Palembang')
    const m = periksa(kolom, baris, { ...opsiDasar, periksaDuplikat: true })
    const dup = m.filter((x) => x.jenis === 'duplikat')
    expect(dup).toHaveLength(1)
    expect(dup[0].baris).toBe(3)
    expect(dup[0].pesan).toContain('baris 1')
  })

  it('menganggap beda huruf besar/kecil sebagai duplikat', () => {
    const { kolom, baris } = bacaCsv('nama\nAndi\nANDI')
    const m = periksa(kolom, baris, { ...opsiDasar, periksaDuplikat: true })
    expect(m.filter((x) => x.jenis === 'duplikat')).toHaveLength(1)
  })

  it('tidak menandai baris yang mirip tapi berbeda', () => {
    const { kolom, baris } = bacaCsv('nama,kota\nAndi,Palembang\nAndi,Prabumulih')
    const m = periksa(kolom, baris, { ...opsiDasar, periksaDuplikat: true })
    expect(m.filter((x) => x.jenis === 'duplikat')).toHaveLength(0)
  })
})

describe('periksa — spasi & jumlah kolom', () => {
  it('mendeteksi spasi berlebih', () => {
    const { kolom, baris } = bacaCsv('nama,kota\n" Andi ",Palembang')
    const m = periksa(kolom, baris, { ...opsiDasar, periksaSpasi: true })
    const sp = m.filter((x) => x.jenis === 'spasi-berlebih')
    expect(sp).toHaveLength(1)
    expect(sp[0].kolom).toBe('nama')
  })

  it('mendeteksi baris dengan jumlah kolom tak sesuai', () => {
    const { kolom, baris } = bacaCsv('a,b,c\n1,2,3\n4,5')
    const m = periksa(kolom, baris, opsiDasar)
    const kt = m.filter((x) => x.jenis === 'kolom-tak-sesuai')
    expect(kt).toHaveLength(1)
    expect(kt[0].baris).toBe(2)
  })

  it('meneruskan galat parsing dari pengurai', () => {
    const h = bacaCsv('a,b\n"tidak ditutup,2')
    const m = periksa(h.kolom, h.baris, opsiDasar, h.galatParsing)
    expect(m.filter((x) => x.jenis === 'galat-parsing').length).toBeGreaterThan(0)
  })
})

describe('ringkas', () => {
  it('menghitung jumlah, sel terisi, dan skor', () => {
    const { kolom, baris } = bacaCsv('nama,umur\nAndi,20\nBudi,21')
    const r = ringkas(kolom, baris, periksa(kolom, baris, opsiDasar))
    expect(r.jumlahBaris).toBe(2)
    expect(r.jumlahKolom).toBe(2)
    expect(r.selTotal).toBe(4)
    expect(r.selTerisi).toBe(4)
    expect(r.skor).toBe(100)
  })

  it('menurunkan skor ketika ada masalah', () => {
    const { kolom, baris } = bacaCsv('nama,umur\nAndi,20\nBudi,\nBudi,')
    const r = ringkas(
      kolom,
      baris,
      periksa(kolom, baris, { kolomWajib: [], periksaSpasi: false, periksaDuplikat: true })
    )
    expect(r.skor).toBeLessThan(100)
    expect(r.skor).toBeGreaterThanOrEqual(0)
  })

  it('skor tetap dalam rentang 0–100 walau banyak masalah', () => {
    const { kolom, baris } = bacaCsv('a\n\n\n\n\n')
    const r = ringkas(kolom, baris, periksa(kolom, baris, opsiDasar, ['x', 'y', 'z']))
    expect(r.skor).toBeGreaterThanOrEqual(0)
    expect(r.skor).toBeLessThanOrEqual(100)
  })
})

describe('buatLaporan', () => {
  it('menyusun laporan teks berisi identitas dan rincian', () => {
    const { kolom, baris } = bacaCsv('nama,umur\nAndi,20\nBudi,')
    const r = ringkas(kolom, baris, periksa(kolom, baris, opsiDasar))
    const lap = buatLaporan(r, 'uji.csv')
    expect(lap).toContain('LAPORAN KUALITAS DATA')
    expect(lap).toContain('uji.csv')
    expect(lap).toContain('Skor')
    expect(lap).toContain('Sel kosong')
    expect(lap).toContain('tidak dikirim ke server')
  })

  it('menyatakan tidak ada masalah bila data bersih', () => {
    const { kolom, baris } = bacaCsv('a,b\n1,2')
    const r = ringkas(kolom, baris, periksa(kolom, baris, opsiDasar))
    expect(buatLaporan(r, 'bersih.csv')).toContain('Tidak ada masalah')
  })
})
