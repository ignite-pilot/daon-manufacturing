-- NOTE: 시뮬레이션은 현재 in-memory(SimStore)로 동작합니다.
-- DB 영속성이 필요할 때 이 마이그레이션을 적용하고 SimStore → DB 쿼리로 전환하세요.

-- 시뮬레이션 프로젝트
CREATE TABLE IF NOT EXISTS sim_projects (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 시뮬레이션 프레임 (프로젝트 하위)
CREATE TABLE IF NOT EXISTS sim_frames (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES sim_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 시뮬레이션 (프레임당 1개, 프레임 생성 시 자동 생성)
CREATE TABLE IF NOT EXISTS simulations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  frame_id   INT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (frame_id) REFERENCES sim_frames(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 시뮬레이션 컴포넌트
CREATE TABLE IF NOT EXISTS sim_components (
  id               VARCHAR(255) PRIMARY KEY,
  sim_id           INT NOT NULL,
  name             VARCHAR(255) NOT NULL,
  type             ENUM('SOURCE','DRAIN','STORAGE','CONVEYOR','STATION') NOT NULL,
  processing_time  INT          DEFAULT 0,     -- ms
  recover_time     INT          DEFAULT 0,     -- ms
  max_value        INT          DEFAULT -1,    -- SOURCE 전용 (-1=무제한)
  storage_capacity INT          DEFAULT 10,   -- STORAGE 전용
  output_method    ENUM('FIFO','QUEUE') DEFAULT 'FIFO',  -- STORAGE 전용
  conveyor_length  DECIMAL(10,2) NULL,        -- CONVEYOR 전용 (m)
  conveyor_speed   DECIMAL(10,2) NULL,        -- CONVEYOR 전용 (m/s)
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sim_id) REFERENCES simulations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 컴포넌트 간 연결 (흐름)
CREATE TABLE IF NOT EXISTS sim_flows (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  sim_id            INT NOT NULL,
  from_component_id VARCHAR(255) NOT NULL,
  to_component_id   VARCHAR(255) NOT NULL,
  ratio             DECIMAL(10,4) DEFAULT 1.0,
  FOREIGN KEY (sim_id) REFERENCES simulations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 시뮬레이션 세션 (실행 이력)
CREATE TABLE IF NOT EXISTS sim_sessions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  sim_id              INT NOT NULL,
  status              ENUM('RUNNING','PAUSED','STOPPED') NOT NULL,
  speed_multiplier    INT          DEFAULT 1,
  start_time          DATETIME     NOT NULL,
  pause_time          DATETIME     NULL,
  resume_time         DATETIME     NULL,
  end_time            DATETIME     NULL,
  simulation_time_ms  BIGINT       DEFAULT 0,  -- 최종 시뮬레이션 경과 시간(ms)
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sim_id) REFERENCES simulations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 시뮬레이션 리포트
CREATE TABLE IF NOT EXISTS sim_reports (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  session_id               INT  NOT NULL,
  sim_id                   INT  NOT NULL,
  total_simulation_time_ms BIGINT NOT NULL,
  start_time               DATETIME NOT NULL,
  end_time                 DATETIME NULL,
  component_stats          JSON,
  created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sim_sessions(id),
  FOREIGN KEY (sim_id)     REFERENCES simulations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
