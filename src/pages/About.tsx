import React from "react";

const About = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">About This Dashboard</h2>
        <p className="text-muted-foreground">Informasi singkat tentang aplikasi ini</p>
      </div>

      <div className="prose max-w-none">
        <h3>ESP32 IoT Dashboard</h3>
        <p>
          Aplikasi ini adalah dashboard monitoring dan kontrol untuk perangkat ESP32. Fitur utamanya:
        </p>
        <ul>
          <li>Memonitor sensor (suhu, kelembapan tanah, kelembapan udara)</li>
          <li>Kontrol LED pada perangkat melalui jadwal atau perintah manual</li>
          <li>Manajemen perangkat (pendaftaran, konfigurasi WiFi)</li>
          <li>Integrasi backend (Supabase) untuk penyimpanan dan autentikasi (opsional)</li>
        </ul>

        <h4>Arsitektur singkat</h4>
        <p>
          Perangkat ESP32 mengirim data sensor ke server (bisa melalui REST atau MQTT). Aplikasi web
          menampilkan data tersebut dan mengirim perintah kontrol. Untuk produksi disarankan
          menggunakan broker MQTT untuk komunikasi realtime dan backend yang menyimpan data di database.
        </p>

        <h4>Pengembang</h4>
        <p>Project ini dikembangkan oleh <strong>Sixity</strong> sebagai contoh aplikasi IoT menggunakan ESP32 dan stack web modern.</p>

        <h4>Kontak saya di 082156370667</h4>
        <p>Untuk pertanyaan atau kontribusi, hubungi pengembang project.</p>
      </div>
    </div>
  );
};

export default About;
