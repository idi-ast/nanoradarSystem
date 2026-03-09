CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "name" VARCHAR(255),
  "hashed_password" VARCHAR(255) NOT NULL,
  "photo_name" varchar,
  "photo_route" varchar,
  "us_idtelegram" varchar,
  "us_phone" varchar,
  "phone_whatsapp" varchar,
  "is_active" bool,
  "is_superuser" bool,
  "created_at" timestamp,
  "updated_at" timestamp,
  "deleted_at" timestamp
);





CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);


CREATE TABLE "companies" (
  "id" integer PRIMARY KEY,
  "code" varchar,
  "sector" varchar,
  "name" varchar,
  "rut" varchar,
  "address" varchar,
  "region" varchar,
  "province" varchar,
  "city" varchar,
  "phone" varchar,
  "email" varchar,
  "is_active" bool,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "company_config" (
  "id" integer PRIMARY KEY,
  "company_id" integer NOT NULL,
  "url" varchar,
  "color" varchar
);

CREATE TABLE "companies_users" (
  "id" integer PRIMARY KEY,
  "company_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "is_active" bool,
  "create_at" timestamp
);

CREATE TABLE "devices" (
  "id" integer PRIMARY KEY,
  "dev_eui" varchar UNIQUE,
  "name" varchar,
  "serial" varchar,
  "company_id" integer,
  "id_device_father" integer,
  "type_device" varchar,
  "last_seen" timestamp,
  "latitude_install" varchar,
  "longitude_install" varchar,
  "latitude_current" varchar,
  "longitude_current" varchar,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "gps_device" (
  "id" integer PRIMARY KEY,
  "accelerometers_status" varchar,
  "battery" integer,
  "version" varchar,
  "vibration_status" varchar,
  "keep_alive_status" varchar,
  "gps_cycle_multiplier" varchar,
  "operating_mode" varchar,
  "annexed" varchar
);

CREATE TABLE "sub_estacion_device" (
  "id" integer PRIMARY KEY,
  "input_1_status" varchar,
  "input_2_status" varchar,
  "input_3_status" varchar,
  "input_4_status" varchar,
  "alert" bool
);

CREATE TABLE "gateway_device" (
  "id" integer PRIMARY KEY,
  "ip_internal" varchar,
  "firmware_version" varchar
);

CREATE TABLE "lector_device" (
  "id" integer PRIMARY KEY,
  "last_date_reader" varchar,
  "battery_reader" integer
);

COMMENT ON COLUMN "devices"."dev_eui" IS 'Unique, indexado';

COMMENT ON COLUMN "devices"."type_device" IS 'Enum: Gateway, Gps, Lector, Subestacion';

COMMENT ON COLUMN "gps_device"."id" IS 'FK a devices.id';

COMMENT ON COLUMN "sub_estacion_device"."id" IS 'FK a devices.id';

COMMENT ON COLUMN "gateway_device"."id" IS 'FK a devices.id';

COMMENT ON COLUMN "lector_device"."id" IS 'FK a devices.id';


ALTER TABLE "companies_users" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "companies_users" ADD FOREIGN KEY ("company_id") REFERENCES "companies" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "company_config" ADD FOREIGN KEY ("company_id") REFERENCES "companies" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "devices" ADD FOREIGN KEY ("company_id") REFERENCES "companies" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "devices" ADD FOREIGN KEY ("id_device_father") REFERENCES "devices" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gps_device" ADD FOREIGN KEY ("id") REFERENCES "devices" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sub_estacion_device" ADD FOREIGN KEY ("id") REFERENCES "devices" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gateway_device" ADD FOREIGN KEY ("id") REFERENCES "devices" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "lector_device" ADD FOREIGN KEY ("id") REFERENCES "devices" ("id") DEFERRABLE INITIALLY IMMEDIATE;






CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, name, hashed_password, is_active, is_superuser)
VALUES (
  'clehue@iotlink.cl',
  'Administrador',
  crypt('astidi2025', gen_salt('bf')),  -- bcrypt
  TRUE,
  FALSE
)
RETURNING id;



INSERT INTO user_sessions (user_id, refresh_token, expires_at)
VALUES (
  1,                                 -- reemplaza por el id real
  gen_random_uuid()::text,           -- requiere pgcrypto o uuid-ossp (ajusta si usas otra función)
  now() + interval '30 days'
)
RETURNING id, refresh_token, expires_at;
