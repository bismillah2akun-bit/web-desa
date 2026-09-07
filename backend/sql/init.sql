SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS village_profile (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,district VARCHAR(120),regency VARCHAR(120),province VARCHAR(120),postal_code VARCHAR(10),area_size_ha DECIMAL(12,2),hamlet_count INT UNSIGNED,boundary_north VARCHAR(255),boundary_east VARCHAR(255),boundary_south VARCHAR(255),boundary_west VARCHAR(255),history TEXT,vision TEXT,mission TEXT,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS news (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,title VARCHAR(255) NOT NULL,slug VARCHAR(255) UNIQUE NOT NULL,category VARCHAR(80),summary TEXT,content LONGTEXT,image_url TEXT,is_published BOOLEAN DEFAULT TRUE,published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS facilities (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(180) NOT NULL,category VARCHAR(80),address TEXT,description TEXT,image_url TEXT,location POINT SRID 4326 NOT NULL,SPATIAL INDEX idx_facilities_location(location)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS potentials (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(180) NOT NULL,category VARCHAR(80),address TEXT,description TEXT,image_url TEXT,location POINT SRID 4326 NOT NULL,SPATIAL INDEX idx_potentials_location(location)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS contacts (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,email VARCHAR(180) NOT NULL,phone VARCHAR(30),subject VARCHAR(255) NOT NULL,message TEXT NOT NULL,status VARCHAR(30) DEFAULT 'baru',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS demographic_summary (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,male_population INT UNSIGNED,female_population INT UNSIGNED,household_count INT UNSIGNED,rw_count INT UNSIGNED,rt_count INT UNSIGNED,data_year SMALLINT UNSIGNED,source TEXT,status VARCHAR(30) DEFAULT 'belum_diverifikasi',updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS administrative_areas (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,rw_number VARCHAR(10) NOT NULL,rt_number VARCHAR(10) NOT NULL,household_count INT UNSIGNED,male_population INT UNSIGNED,female_population INT UNSIGNED,data_year SMALLINT UNSIGNED,source TEXT,status VARCHAR(30) DEFAULT 'belum_diverifikasi',updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_rw_rt(rw_number,rt_number)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS guestbook (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,institution VARCHAR(180),address TEXT,phone VARCHAR(30),email VARCHAR(180),visit_purpose VARCHAR(255) NOT NULL,message TEXT,visit_date DATE DEFAULT (CURRENT_DATE),status VARCHAR(30) DEFAULT 'baru',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS admins (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,username VARCHAR(80) UNIQUE NOT NULL,display_name VARCHAR(150) NOT NULL,password_hash TEXT NOT NULL,role VARCHAR(30) DEFAULT 'admin',is_active BOOLEAN DEFAULT TRUE,last_login_at TIMESTAMP NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS government_officials (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  position VARCHAR(180) NOT NULL,
  name VARCHAR(180),
  description TEXT,
  sort_order INT UNSIGNED DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS service_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(190) UNIQUE NOT NULL,
  description TEXT,
  estimated_days INT UNSIGNED,
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS service_requirements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_type_id INT UNSIGNED NOT NULL,
  label VARCHAR(180) NOT NULL,
  field_name VARCHAR(190) NOT NULL,
  field_type ENUM('text','textarea','number','date','select','file') NOT NULL,
  instructions TEXT,
  options_json JSON,
  is_required BOOLEAN DEFAULT TRUE,
  accepted_formats VARCHAR(255),
  max_file_size_mb INT UNSIGNED,
  sort_order INT UNSIGNED DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_service_requirements_type (service_type_id),
  CONSTRAINT fk_service_requirement_type FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS service_applications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_type_id INT UNSIGNED NOT NULL,
  tracking_code VARCHAR(24) UNIQUE NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  nik VARCHAR(20),
  whatsapp VARCHAR(30) NOT NULL,
  email VARCHAR(180),
  address TEXT,
  status ENUM('diajukan','diperiksa','revisi','disetujui','selesai','ditolak') DEFAULT 'diajukan',
  admin_note TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_application_service FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE RESTRICT,
  INDEX idx_application_tracking (tracking_code),
  INDEX idx_application_status (status)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS application_values (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  requirement_id INT UNSIGNED NOT NULL,
  value_text LONGTEXT,
  CONSTRAINT fk_value_application FOREIGN KEY (application_id) REFERENCES service_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_value_requirement FOREIGN KEY (requirement_id) REFERENCES service_requirements(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_application_requirement (application_id, requirement_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS application_files (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  requirement_id INT UNSIGNED NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_file_application FOREIGN KEY (application_id) REFERENCES service_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_file_requirement FOREIGN KEY (requirement_id) REFERENCES service_requirements(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_application_file_requirement (application_id, requirement_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS application_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  status ENUM('diajukan','diperiksa','revisi','disetujui','selesai','ditolak') NOT NULL,
  note TEXT,
  changed_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_application FOREIGN KEY (application_id) REFERENCES service_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_admin FOREIGN KEY (changed_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;
INSERT INTO village_profile(name,district,regency,province,postal_code,history,vision,mission) SELECT 'Desa Tanjungjaya','Cihampelas','Bandung Barat','Jawa Barat','40562','Wilayah Tanjungjaya semula merupakan bagian dari Desa Rancairung. Pemekaran disepakati pada 17 November 1972.','Data visi akan diperbarui oleh admin desa.','Data misi akan diperbarui oleh admin desa.' WHERE NOT EXISTS(SELECT 1 FROM village_profile);
INSERT INTO demographic_summary(source,status) SELECT 'Menunggu data Pemerintah Desa Tanjungjaya','belum_diverifikasi' WHERE NOT EXISTS(SELECT 1 FROM demographic_summary);
INSERT INTO government_officials(position,sort_order) SELECT 'Kepala Desa',1 WHERE NOT EXISTS(SELECT 1 FROM government_officials);
INSERT INTO government_officials(position,sort_order) SELECT 'Sekretaris Desa',2 WHERE NOT EXISTS(SELECT 1 FROM government_officials WHERE position='Sekretaris Desa');
INSERT INTO government_officials(position,sort_order) SELECT 'Kepala Urusan Tata Usaha',3 WHERE NOT EXISTS(SELECT 1 FROM government_officials WHERE position='Kepala Urusan Tata Usaha');
INSERT INTO government_officials(position,sort_order) SELECT 'Kepala Urusan Keuangan',4 WHERE NOT EXISTS(SELECT 1 FROM government_officials WHERE position='Kepala Urusan Keuangan');
INSERT INTO government_officials(position,sort_order) SELECT 'Kepala Seksi Pemerintahan',5 WHERE NOT EXISTS(SELECT 1 FROM government_officials WHERE position='Kepala Seksi Pemerintahan');
INSERT INTO government_officials(position,sort_order) SELECT 'Kepala Seksi Kesejahteraan',6 WHERE NOT EXISTS(SELECT 1 FROM government_officials WHERE position='Kepala Seksi Kesejahteraan');
INSERT INTO government_officials(position,sort_order) SELECT 'Kepala Dusun I',7 WHERE NOT EXISTS(SELECT 1 FROM government_officials WHERE position='Kepala Dusun I');
INSERT INTO government_officials(position,sort_order) SELECT 'Kepala Dusun II',8 WHERE NOT EXISTS(SELECT 1 FROM government_officials WHERE position='Kepala Dusun II');
INSERT IGNORE INTO news(title,slug,category,summary,content) VALUES ('Informasi Pelayanan Administrasi Desa','informasi-pelayanan-administrasi-desa','Pelayanan','Panduan singkat pelayanan administrasi warga.','Konten contoh akan diperbarui admin desa.'),('Kerja Bakti dan Pemeliharaan Lingkungan','kerja-bakti-lingkungan','Kegiatan','Kegiatan bersama menjaga lingkungan desa.','Konten contoh akan diperbarui admin desa.');
INSERT INTO facilities(name,category,address,description,location) SELECT 'Kantor Desa Tanjungjaya','Kantor Desa','Kecamatan Cihampelas, Bandung Barat','Posisi referensi, perlu verifikasi lapangan',ST_SRID(POINT(107.4280,-6.9248),4326) WHERE NOT EXISTS(SELECT 1 FROM facilities WHERE name='Kantor Desa Tanjungjaya');
INSERT INTO facilities(name,category,address,description,location) SELECT 'Fasilitas Pendidikan Contoh','Pendidikan','Alamat akan diperbarui','Data contoh',ST_SRID(POINT(107.4205,-6.9195),4326) WHERE NOT EXISTS(SELECT 1 FROM facilities WHERE name='Fasilitas Pendidikan Contoh');
INSERT INTO potentials(name,category,address,description,location) SELECT 'Sentra UMKM Contoh','UMKM','Alamat akan diperbarui','Data contoh',ST_SRID(POINT(107.4125,-6.9165),4326) WHERE NOT EXISTS(SELECT 1 FROM potentials WHERE name='Sentra UMKM Contoh');
INSERT INTO potentials(name,category,address,description,location) SELECT 'Area Pertanian Contoh','Pertanian','Alamat akan diperbarui','Data contoh',ST_SRID(POINT(107.4380,-6.9280),4326) WHERE NOT EXISTS(SELECT 1 FROM potentials WHERE name='Area Pertanian Contoh');
