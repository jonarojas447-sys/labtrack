-- ================================================================
-- LABTRACK - Sistema de Trazabilidad de Activos Tecnológicos
-- Inicialización de base de datos PostgreSQL
-- ================================================================

-- ─── Tipos enumerados ──────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'encargado', 'usuario');
CREATE TYPE asset_status AS ENUM ('disponible', 'prestado', 'mantenimiento', 'dado_de_baja', 'reservado');
CREATE TYPE asset_category AS ENUM ('sensor', 'placa', 'robotica', 'vr', 'computo', 'herramienta', 'otro');
CREATE TYPE loan_status AS ENUM ('activo', 'devuelto', 'vencido', 'cancelado');
CREATE TYPE maintenance_status AS ENUM ('pendiente', 'en_proceso', 'completado', 'cancelado');
CREATE TYPE audit_action AS ENUM (
  'crear', 'editar', 'eliminar', 'prestar', 'devolver',
  'mantenimiento_inicio', 'mantenimiento_fin', 'dar_de_baja',
  'login', 'logout', 'exportar', 'importar'
);

-- ─── Tabla: usuarios ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  apellido    VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  rol         user_role NOT NULL DEFAULT 'usuario',
  activo      BOOLEAN DEFAULT TRUE,
  avatar_url  VARCHAR(255),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ─── Tabla: ubicaciones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ubicaciones (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── Tabla: activos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activos (
  id              SERIAL PRIMARY KEY,
  codigo          VARCHAR(50) UNIQUE NOT NULL,
  nombre          VARCHAR(150) NOT NULL,
  descripcion     TEXT,
  categoria       asset_category NOT NULL,
  marca           VARCHAR(100),
  modelo          VARCHAR(100),
  numero_serie    VARCHAR(150),
  estado          asset_status NOT NULL DEFAULT 'disponible',
  ubicacion_id    INT REFERENCES ubicaciones(id),
  responsable_id  INT REFERENCES usuarios(id),
  fecha_adquisicion DATE,
  valor           NUMERIC(10,2),
  imagen_url      VARCHAR(255),
  especificaciones JSONB,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─── Tabla: prestamos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prestamos (
  id              SERIAL PRIMARY KEY,
  activo_id       INT NOT NULL REFERENCES activos(id),
  usuario_id      INT NOT NULL REFERENCES usuarios(id),
  autorizado_por  INT REFERENCES usuarios(id),
  fecha_prestamo  TIMESTAMP DEFAULT NOW(),
  fecha_devolucion_esperada TIMESTAMP NOT NULL,
  fecha_devolucion_real     TIMESTAMP,
  estado          loan_status NOT NULL DEFAULT 'activo',
  proposito       TEXT NOT NULL,
  notas           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─── Tabla: mantenimientos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mantenimientos (
  id              SERIAL PRIMARY KEY,
  activo_id       INT NOT NULL REFERENCES activos(id),
  solicitado_por  INT REFERENCES usuarios(id),
  tecnico_id      INT REFERENCES usuarios(id),
  tipo            VARCHAR(100) NOT NULL,
  descripcion     TEXT NOT NULL,
  estado          maintenance_status NOT NULL DEFAULT 'pendiente',
  fecha_inicio    TIMESTAMP,
  fecha_fin       TIMESTAMP,
  costo           NUMERIC(10,2),
  notas_tecnico   TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─── Tabla: auditoría ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  INT REFERENCES usuarios(id),
  accion      audit_action NOT NULL,
  entidad     VARCHAR(50) NOT NULL,
  entidad_id  INT,
  detalle     JSONB,
  ip_origen   VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── Tabla: notificaciones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuarios(id),
  titulo      VARCHAR(200) NOT NULL,
  mensaje     TEXT NOT NULL,
  tipo        VARCHAR(50) DEFAULT 'info',
  leida       BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── Índices para rendimiento ──────────────────────────────────────
CREATE INDEX idx_activos_estado   ON activos(estado);
CREATE INDEX idx_activos_categoria ON activos(categoria);
CREATE INDEX idx_activos_codigo   ON activos(codigo);
CREATE INDEX idx_prestamos_activo ON prestamos(activo_id);
CREATE INDEX idx_prestamos_usuario ON prestamos(usuario_id);
CREATE INDEX idx_prestamos_estado ON prestamos(estado);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha  ON auditoria(created_at);

-- ─── Datos iniciales ───────────────────────────────────────────────

-- Ubicaciones
INSERT INTO ubicaciones (nombre, descripcion) VALUES
  ('Laboratorio Principal', 'Área central de equipos de cómputo y desarrollo'),
  ('Almacén A', 'Bodega de sensores y placas electrónicas'),
  ('Sala VR', 'Espacio dedicado a dispositivos de realidad virtual'),
  ('Taller Robótica', 'Área de ensamble y prueba de kits robóticos'),
  ('Préstamo Externo', 'Activos actualmente fuera del laboratorio');

-- Usuario admin por defecto (password: Admin123!)
INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES
  ('Admin', 'LabTrack', 'admin@labtrack.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('Carlos', 'Martínez', 'carlos@labtrack.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'encargado'),
  ('Ana', 'Rodríguez', 'ana@labtrack.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'usuario');

-- Activos de ejemplo
INSERT INTO activos (codigo, nombre, descripcion, categoria, marca, modelo, numero_serie, estado, ubicacion_id, responsable_id, valor, especificaciones) VALUES
  ('SEN-001', 'Sensor de temperatura DHT22', 'Sensor digital de temperatura y humedad', 'sensor', 'Aosong', 'DHT22', 'AOS-22-001', 'disponible', 2, 2, 85.00, '{"voltaje": "3.3-5V", "precision": "±0.5°C"}'),
  ('SEN-002', 'Sensor ultrasónico HC-SR04', 'Sensor de distancia por ultrasonido', 'sensor', 'Generic', 'HC-SR04', 'HCSR-002', 'prestado', 2, 2, 45.00, '{"rango": "2cm-400cm", "frecuencia": "40kHz"}'),
  ('PLA-001', 'Arduino Mega 2560', 'Microcontrolador para proyectos de IoT', 'placa', 'Arduino', 'Mega 2560', 'ARD-MEGA-001', 'disponible', 1, 2, 650.00, '{"flash": "256KB", "pines_digitales": 54}'),
  ('PLA-002', 'Raspberry Pi 4 Model B', 'Computadora de placa única 8GB RAM', 'placa', 'Raspberry Pi Foundation', 'Pi 4B 8GB', 'RPF-4B8-002', 'mantenimiento', 1, 2, 1800.00, '{"ram": "8GB", "cpu": "Cortex-A72 1.5GHz"}'),
  ('VR-001', 'Meta Quest 3', 'Visor de realidad virtual standalone', 'vr', 'Meta', 'Quest 3', 'META-Q3-001', 'disponible', 3, 2, 7500.00, '{"almacenamiento": "128GB", "resolucion": "2064x2208"}'),
  ('ROB-001', 'Kit Educativo Lego Mindstorms', 'Kit completo de robótica educativa', 'robotica', 'Lego', 'Mindstorms EV3', 'LEGO-EV3-001', 'disponible', 4, 2, 4200.00, '{"piezas": "601", "motores": 3}'),
  ('COM-001', 'Laptop Dell XPS 15', 'Laptop de alto rendimiento para desarrollo', 'computo', 'Dell', 'XPS 15 9530', 'DELL-XPS-001', 'prestado', 5, 2, 32000.00, '{"ram": "32GB", "cpu": "Intel i9-13900H", "almacenamiento": "1TB SSD"}'),
  ('HER-001', 'Estación de soldado Hakko', 'Estación de soldadura de precisión', 'herramienta', 'Hakko', 'FX-888D', 'HAK-888-001', 'disponible', 1, 2, 2800.00, '{"temperatura_max": "480°C", "potencia": "70W"}');
