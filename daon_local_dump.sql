-- MySQL dump 10.13  Distrib 8.4.8, for Linux (x86_64)
--
-- Host: localhost    Database: daon_manufacturing
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `factory`
--

DROP TABLE IF EXISTS `factory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '공장 이름',
  `zip_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '우편번호',
  `address` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '주소',
  `address_detail` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '상세 주소',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '공장 설명',
  `area` decimal(12,2) DEFAULT NULL COMMENT '면적',
  `cad_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CAD 파일 경로',
  `deleted_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_factory_deleted` (`deleted_yn`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제조 공장';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `factory`
--

LOCK TABLES `factory` WRITE;
/*!40000 ALTER TABLE `factory` DISABLE KEYS */;
INSERT INTO `factory` VALUES (1,'범퍼 제조공장',NULL,'주소 미확인 (원본 자료 미포함)',NULL,'현대·제네시스 차량 FRT/RR 범퍼 조립 공장',NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL);
/*!40000 ALTER TABLE `factory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine`
--

DROP TABLE IF EXISTS `machine`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `factory_id` bigint unsigned NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '기계 이름',
  `total_duration_sec` int unsigned DEFAULT '0' COMMENT '기계 소요시간(초)',
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `manufacturer` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `as_contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'AS 담당자',
  `as_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'AS 연락처',
  `introduced_at` datetime DEFAULT NULL COMMENT '도입일시',
  `location_in_factory` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '공장내 위치',
  `deleted_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_machine_factory` (`factory_id`),
  KEY `idx_machine_deleted` (`deleted_yn`),
  CONSTRAINT `fk_machine_factory` FOREIGN KEY (`factory_id`) REFERENCES `factory` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기계';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine`
--

LOCK TABLES `machine` WRITE;
/*!40000 ALTER TABLE `machine` DISABLE KEYS */;
INSERT INTO `machine` VALUES (1,1,'펀칭 장비',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(2,1,'가서열대',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(3,1,'U지그',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(4,1,'H지그',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(5,1,'초음파 장비',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(6,1,'N지그',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(7,1,'서브 컨베어',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(8,1,'통전/이종 검사기',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(9,1,'압입기',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(10,1,'버퍼 컨베어',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(11,1,'RSPA장비',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(12,1,'리벳 건',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(13,1,'번호판 리딩&펀칭 장비',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL);
/*!40000 ALTER TABLE `machine` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_operation_step`
--

DROP TABLE IF EXISTS `machine_operation_step`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_operation_step` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` bigint unsigned NOT NULL,
  `step_order` int unsigned NOT NULL DEFAULT '0',
  `step_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '순서 이름',
  `duration_min` int unsigned DEFAULT '0' COMMENT '세부 소요시간(분)',
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_machine_op_machine` (`machine_id`),
  CONSTRAINT `fk_machine_op_machine` FOREIGN KEY (`machine_id`) REFERENCES `machine` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기계 동작 순서';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_operation_step`
--

LOCK TABLES `machine_operation_step` WRITE;
/*!40000 ALTER TABLE `machine_operation_step` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_operation_step` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_operation_step_part`
--

DROP TABLE IF EXISTS `machine_operation_step_part`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_operation_step_part` (
  `operation_step_id` bigint unsigned NOT NULL,
  `part_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`operation_step_id`,`part_id`),
  KEY `fk_mop_part_part` (`part_id`),
  CONSTRAINT `fk_mop_part_part` FOREIGN KEY (`part_id`) REFERENCES `part` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mop_part_step` FOREIGN KEY (`operation_step_id`) REFERENCES `machine_operation_step` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_operation_step_part`
--

LOCK TABLES `machine_operation_step_part` WRITE;
/*!40000 ALTER TABLE `machine_operation_step_part` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_operation_step_part` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_required_part`
--

DROP TABLE IF EXISTS `machine_required_part`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_required_part` (
  `machine_id` bigint unsigned NOT NULL,
  `part_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`machine_id`,`part_id`),
  KEY `fk_machine_req_part_part` (`part_id`),
  CONSTRAINT `fk_machine_req_part_machine` FOREIGN KEY (`machine_id`) REFERENCES `machine` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_machine_req_part_part` FOREIGN KEY (`part_id`) REFERENCES `part` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기계 필수 부품';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_required_part`
--

LOCK TABLES `machine_required_part` WRITE;
/*!40000 ALTER TABLE `machine_required_part` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_required_part` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `part`
--

DROP TABLE IF EXISTS `part`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `part` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `factory_id` bigint unsigned NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '부품 이름',
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `manufacturer` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `as_contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `as_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_part_factory` (`factory_id`),
  KEY `idx_part_deleted` (`deleted_yn`),
  CONSTRAINT `fk_part_factory` FOREIGN KEY (`factory_id`) REFERENCES `factory` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부품';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `part`
--

LOCK TABLES `part` WRITE;
/*!40000 ALTER TABLE `part` DISABLE KEYS */;
INSERT INTO `part` VALUES (1,1,'범퍼',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(2,1,'범퍼그릴',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(3,1,'범퍼로워',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(4,1,'범퍼어퍼',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(5,1,'범퍼몰딩 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(6,1,'범퍼몰딩 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(7,1,'범퍼 몰딩 및 어퍼 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(8,1,'범퍼 몰딩 및 어퍼 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(9,1,'센서홀더',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(10,1,'센서홀더 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(11,1,'센서홀더 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(12,1,'센서 홀더',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(13,1,'센서홀더/카메라/코너레이더',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(14,1,'사이드브라켓 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(15,1,'사이드브라켓 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(16,1,'사이드브라켓',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(17,1,'사이드 어퍼 브라켓 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(18,1,'사이드 어퍼 브라켓 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(19,1,'스크류',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(20,1,'스크류 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(21,1,'스크류 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(22,1,'육각 스크류',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(23,1,'센서',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(24,1,'라지에이터 그릴',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(25,1,'SCC',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(26,1,'에어덕트',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(27,1,'에어덕트 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(28,1,'에어덕트 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(29,1,'에어덕트 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(30,1,'에어덕트 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(31,1,'에어덕트 피스 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(32,1,'에어덕트 피스 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(33,1,'에어덕트 피스/에어덕트/램프 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(34,1,'에어덕트 피스/에어덕트/램프 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(35,1,'UWB',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(36,1,'사이드 덕트',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(37,1,'코너레이더',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(38,1,'코너레이더 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(39,1,'코너레이더 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(40,1,'리벳',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(41,1,'리벳 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(42,1,'리벳 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(43,1,'카메라',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(44,1,'공용센서',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(45,1,'와이어링 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(46,1,'와이어링 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(47,1,'와이어링',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(48,1,'센터 센서',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(49,1,'E/ABS',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(50,1,'헤드램프',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(51,1,'헤드램프 브라켓',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(52,1,'헤드램프 브라켓 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(53,1,'헤드램프 브라켓 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(54,1,'헤드램프 로워 마운팅 브라켓 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(55,1,'헤드램프 로워 마운팅 브라켓 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(56,1,'엠블럼',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(57,1,'REINF',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(58,1,'소프트',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(59,1,'사이드 그릴 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(60,1,'사이드 그릴 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(61,1,'어퍼 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(62,1,'어퍼 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(63,1,'어퍼 센서',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(64,1,'스키드',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(65,1,'스키드 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(66,1,'스키드 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(67,1,'센터몰딩',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(68,1,'센터 스키드',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(69,1,'사이드 몰딩 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(70,1,'사이드 몰딩 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(71,1,'사이드몰딩 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(72,1,'사이드몰딩 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(73,1,'립',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(74,1,'토잉캡',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(75,1,'보호랩',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(76,1,'보호랩 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(77,1,'보호랩 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(78,1,'너트스프링 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(79,1,'너트스프링 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(80,1,'센터 브라켓 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(81,1,'센터 브라켓 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(82,1,'사이드램프 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(83,1,'사이드 램프 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(84,1,'플랜 브라켓 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(85,1,'플랜 브라켓 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(86,1,'플랜지 브라켓 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(87,1,'플랜지 브라켓 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(88,1,'클립훼스너 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(89,1,'클립 훼스너 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(90,1,'푸쉬 너트 RH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(91,1,'푸쉬 너트 LH',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(92,1,'사이드 로워 브라켓 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(93,1,'사이드 로워 브라켓 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(94,1,'라지에이터 어퍼',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(95,1,'웨자스트립',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(96,1,'FRT 몰딩 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(97,1,'FRT 몰딩 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(98,1,'센터브라켓',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(99,1,'사이드 센서',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(100,1,'홀더',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(101,1,'LWR',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(102,1,'스프링너트',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(103,1,'스프링너트 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(104,1,'스프링너트 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(105,1,'부직포',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(106,1,'번호판 램프 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(107,1,'번호판 램프 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(108,1,'너트 스프링',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(109,1,'UWB 브라켓 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(110,1,'UWB 브라켓 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(111,1,'코너레이더 브라켓 및 리벳',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(112,1,'리플렉터',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(113,1,'리플렉터 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(114,1,'리플렉터 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(115,1,'센터도장몰딩',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(116,1,'도장 센터몰딩류 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(117,1,'도장 센터몰딩류 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(118,1,'리테이너',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(119,1,'리테이너 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(120,1,'리테이너 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(121,1,'테일트림',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(122,1,'테일트림 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(123,1,'테일트림 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(124,1,'언더커버',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(125,1,'사이드덕트',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(126,1,'로워',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(127,1,'사이드',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(128,1,'램프',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(129,1,'램프 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(130,1,'램프 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(131,1,'포그램프',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(132,1,'백빔',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(133,1,'백빔 리테이너',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(134,1,'사이드피스',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(135,1,'사이드피스/스키드 피스/립 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(136,1,'사이드피스/스키드 피스/립 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(137,1,'안테나',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(138,1,'센터 리플렉터',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(139,1,'피스 및 스키드',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(140,1,'마운팅 브라켓 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(141,1,'마운팅 브라켓 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(142,1,'육각 너트 L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(143,1,'육각 너트 R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(144,1,'로워 몰딩',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(145,1,'몰딩',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(146,1,'LWR/CTR L',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(147,1,'LWR/CTR R',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:23:47',NULL),(148,1,'사이드몰딩',NULL,NULL,NULL,NULL,NULL,'N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL);
/*!40000 ALTER TABLE `part` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan`
--

DROP TABLE IF EXISTS `plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '도면 이름',
  `version` int unsigned NOT NULL DEFAULT '1' COMMENT '버전 (수정할 때마다 +1)',
  `factory_id` bigint unsigned DEFAULT NULL COMMENT '연관 공장 (선택)',
  `building` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '미지정' COMMENT '건물 이름',
  `floor` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '층',
  `original_file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '업로드 원본 파일명',
  `original_file_format` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '파일 형식: dxf | dwg | jpg | png | xlsx | pdf | pptx',
  `original_file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MinIO 오브젝트 공개 URL',
  `svg_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '변환된 SVG 파일 MinIO URL',
  `metadata_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'JSON 메타데이터 MinIO URL',
  `analysis_result_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'LLM 분석 결과 JSON MinIO URL',
  `analysis_notes_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '추가 수정 내용 텍스트 MinIO URL',
  `additional_instructions` text COLLATE utf8mb4_unicode_ci COMMENT '분석 보조 정보 (step 3 이용자 입력)',
  `analysis_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | ANALYZING | COMPLETED | FAILED',
  `analysis_error` text COLLATE utf8mb4_unicode_ci COMMENT '분석 실패 시 오류 메시지',
  `deleted_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_plan_factory` (`factory_id`),
  KEY `idx_plan_deleted` (`deleted_yn`),
  KEY `idx_plan_status` (`analysis_status`),
  CONSTRAINT `fk_plan_factory` FOREIGN KEY (`factory_id`) REFERENCES `factory` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공간 관리 - 도면 원장';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan`
--

LOCK TABLES `plan` WRITE;
/*!40000 ALTER TABLE `plan` DISABLE KEYS */;
INSERT INTO `plan` VALUES (2,'Line 51 공장 배치도',1,NULL,'미지정','1','line51_layout.dxf','dxf','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/seed/original.dxf','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/2/drawing.svg','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/2/metadata.json',NULL,NULL,NULL,'COMPLETED',NULL,'N','2026-04-21 03:58:28','2026-04-21 03:58:28','system-seed'),(3,'20260129_daon_layout_line51_cropped',1,1,'미지정','1','20260129_daon_layout_line51_cropped.dxf','dxf','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/34766e5d-9aff-4014-9170-41b0b77e69ab-20260129_daon_layout_line51_cropped.dxf',NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,'Y','2026-04-23 05:43:13','2026-04-23 05:43:34','Hwan Cho'),(4,'Line 51 ���̾ƿ� (Cropped)',4,NULL,'미지정','1','daon_layout_line51_cropped.dxf','dxf','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/ea04882f-a248-4e52-9025-8a004386e32f-daon_layout_line51_cropped.dxf','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/4/drawing.svg','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/4/metadata.json','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/4/analysis_result.json','http://localhost:9000/daon-mfg-local/daon-manufacturing/plans/4/analysis_notes.txt',NULL,'COMPLETED',NULL,'N','2026-04-23 09:28:05','2026-04-23 14:38:19','Hwan Cho');
/*!40000 ALTER TABLE `plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan_upload_audit`
--

DROP TABLE IF EXISTS `plan_upload_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_upload_audit` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` bigint unsigned DEFAULT NULL COMMENT '생성된 plan ID; 악성 파일이면 NULL',
  `uploaded_by` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '업로드 시도 사용자 (updated_by 형식)',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '클라이언트 IP',
  `original_file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '업로드 원본 파일명',
  `original_file_format` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '파일 형식',
  `file_size` bigint unsigned DEFAULT NULL COMMENT '파일 크기 (bytes)',
  `malware_detected` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N' COMMENT '악성 파일 탐지 여부 (Y/N)',
  `malware_detail` text COLLATE utf8mb4_unicode_ci COMMENT '악성 탐지 상세 내용 (차후 구현)',
  `upload_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_plan` (`plan_id`),
  KEY `idx_audit_uploaded_by` (`uploaded_by`),
  KEY `idx_audit_malware` (`malware_detected`),
  CONSTRAINT `fk_audit_plan` FOREIGN KEY (`plan_id`) REFERENCES `plan` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공간 관리 - 업로드 감사 로그';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_upload_audit`
--

LOCK TABLES `plan_upload_audit` WRITE;
/*!40000 ALTER TABLE `plan_upload_audit` DISABLE KEYS */;
INSERT INTO `plan_upload_audit` VALUES (1,3,'Hwan Cho','::1','20260129_daon_layout_line51_cropped.dxf','dxf',18794795,'N',NULL,'2026-04-23 05:43:14'),(2,4,'Hwan Cho','::1','daon_layout_line51_cropped.dxf','dxf',NULL,'N',NULL,'2026-04-23 09:28:05');
/*!40000 ALTER TABLE `plan_upload_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process`
--

DROP TABLE IF EXISTS `process`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `factory_id` bigint unsigned NOT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '대상 완제품',
  `process_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '공정 이름',
  `total_duration_sec` int unsigned NOT NULL DEFAULT '0' COMMENT '전체 소요시간(초)',
  `description` text COLLATE utf8mb4_unicode_ci,
  `deleted_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_process_factory` (`factory_id`),
  KEY `idx_process_deleted` (`deleted_yn`),
  CONSTRAINT `fk_process_factory` FOREIGN KEY (`factory_id`) REFERENCES `factory` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공정';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process`
--

LOCK TABLES `process` WRITE;
/*!40000 ALTER TABLE `process` DISABLE KEYS */;
INSERT INTO `process` VALUES (1,1,'G80 3세대 FRT 범퍼 (STD)','G80 3세대 FRT 범퍼 조립 공정 (STD)',685,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:12',NULL),(2,1,'G80 3세대 FRT 범퍼 (SPT)','G80 3세대 FRT 범퍼 조립 공정 (SPT)',685,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:12',NULL),(3,1,'G70 페이스리프트 FRT 범퍼','G70 페이스리프트 FRT 범퍼 조립 공정',740,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:12',NULL),(4,1,'G90 4세대 FRT 범퍼','G90 4세대 FRT 범퍼 조립 공정',818,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:12',NULL),(5,1,'G90 4세대 리무진 FRT 범퍼','G90 4세대 리무진 FRT 범퍼 조립 공정',830,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:12',NULL),(6,1,'펠리세이드 2세대 FRT 범퍼','펠리세이드 2세대 FRT 범퍼 조립 공정',932,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:12',NULL),(7,1,'G80 3세대 RR 범퍼 (STD)','G80 3세대 RR 범퍼 조립 공정 (STD)',831,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:12',NULL),(8,1,'G80 3세대 RR 범퍼 (SPT)','G80 3세대 RR 범퍼 조립 공정 (SPT)',763,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:12',NULL),(9,1,'G70 페이스리프트 RR 범퍼','G70 페이스리프트 RR 범퍼 조립 공정',348,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:13',NULL),(10,1,'G70 스포츠 RR 범퍼','G70 스포츠 RR 범퍼 조립 공정',289,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:13',NULL),(11,1,'G90 4세대 RR 범퍼','G90 4세대 RR 범퍼 조립 공정',751,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:13',NULL),(12,1,'G90 4세대 리무진 RR 범퍼','G90 4세대 리무진 RR 범퍼 조립 공정',646,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:13',NULL),(13,1,'펠리세이드 2세대 RR 범퍼','펠리세이드 2세대 RR 범퍼 조립 공정',608,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:13',NULL),(14,1,'펠리세이드 2세대 캘리그래피 RR 범퍼','펠리세이드 2세대 캘리그래피 RR 범퍼 조립 공정',563,NULL,'N','2026-04-14 00:23:47','2026-04-14 00:24:13',NULL);
/*!40000 ALTER TABLE `process` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_step`
--

DROP TABLE IF EXISTS `process_step`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_step` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `process_id` bigint unsigned NOT NULL,
  `work_id` bigint unsigned DEFAULT NULL COMMENT '작업 ID; NULL이면 단계만 표시',
  `step_order` int unsigned NOT NULL DEFAULT '0',
  `actual_duration_min` int unsigned DEFAULT NULL COMMENT '실 소요시간(초, 컬럼명은 min이지만 초 단위 저장)',
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_process_step_process` (`process_id`),
  KEY `idx_process_step_work` (`work_id`),
  CONSTRAINT `fk_process_step_process` FOREIGN KEY (`process_id`) REFERENCES `process` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_process_step_work` FOREIGN KEY (`work_id`) REFERENCES `work` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=201 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공정 단계';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_step`
--

LOCK TABLES `process_step` WRITE;
/*!40000 ALTER TABLE `process_step` DISABLE KEYS */;
INSERT INTO `process_step` VALUES (1,1,1,1,NULL,'가조립1'),(2,1,2,2,NULL,'가조립2'),(3,1,NULL,3,NULL,'가조립3'),(4,1,NULL,4,NULL,'가조립4'),(5,1,3,5,NULL,'조립1'),(6,1,4,6,NULL,'조립2'),(7,1,5,7,NULL,'조립3'),(8,1,6,8,NULL,'조립4'),(9,1,7,9,NULL,'조립5'),(10,1,8,10,NULL,'조립6'),(11,1,9,11,NULL,'조립7'),(12,1,10,12,NULL,'조립8'),(13,1,11,13,NULL,'조립9'),(14,1,12,14,NULL,'조립10'),(15,1,13,15,NULL,'조립11'),(16,1,14,16,NULL,'조립12'),(17,2,15,1,NULL,'가조립1'),(18,2,16,2,NULL,'가조립2'),(19,2,NULL,3,NULL,'가조립3'),(20,2,NULL,4,NULL,'가조립4'),(21,2,17,5,NULL,'조립1'),(22,2,18,6,NULL,'조립2'),(23,2,19,7,NULL,'조립3'),(24,2,20,8,NULL,'조립4'),(25,2,21,9,NULL,'조립5'),(26,2,22,10,NULL,'조립6'),(27,2,23,11,NULL,'조립7'),(28,2,24,12,NULL,'조립8'),(29,2,25,13,NULL,'조립9'),(30,2,26,14,NULL,'조립10'),(31,2,27,15,NULL,'조립11'),(32,2,28,16,NULL,'조립12'),(33,3,29,1,NULL,'가조립1'),(34,3,30,2,NULL,'가조립2'),(35,3,31,3,NULL,'가조립3'),(36,3,32,4,NULL,'가조립4'),(37,3,33,5,NULL,'조립1'),(38,3,34,6,NULL,'조립2'),(39,3,35,7,NULL,'조립3'),(40,3,36,8,NULL,'조립4'),(41,3,37,9,NULL,'조립5'),(42,3,38,10,NULL,'조립6'),(43,3,39,11,NULL,'조립7'),(44,3,40,12,NULL,'조립8'),(45,3,41,13,NULL,'조립9'),(46,3,NULL,14,NULL,'조립10'),(47,3,42,15,NULL,'조립11'),(48,3,43,16,NULL,'조립12'),(49,4,44,1,NULL,'가조립1'),(50,4,45,2,NULL,'가조립2'),(51,4,46,3,NULL,'가조립3'),(52,4,47,4,NULL,'가조립4'),(53,4,48,5,NULL,'조립1'),(54,4,49,6,NULL,'조립2'),(55,4,50,7,NULL,'조립3'),(56,4,51,8,NULL,'조립4'),(57,4,52,9,NULL,'조립5'),(58,4,53,10,NULL,'조립6'),(59,4,54,11,NULL,'조립7'),(60,4,55,12,NULL,'조립8'),(61,4,56,13,NULL,'조립9'),(62,4,57,14,NULL,'조립10'),(63,4,58,15,NULL,'조립11'),(64,4,59,16,NULL,'조립12'),(65,5,60,1,NULL,'가조립1'),(66,5,61,2,NULL,'가조립2'),(67,5,62,3,NULL,'가조립3'),(68,5,63,4,NULL,'가조립4'),(69,5,64,5,NULL,'조립1'),(70,5,65,6,NULL,'조립2'),(71,5,66,7,NULL,'조립3'),(72,5,67,8,NULL,'조립4'),(73,5,68,9,NULL,'조립5'),(74,5,69,10,NULL,'조립6'),(75,5,70,11,NULL,'조립7'),(76,5,71,12,NULL,'조립8'),(77,5,72,13,NULL,'조립9'),(78,5,73,14,NULL,'조립10'),(79,5,74,15,NULL,'조립11'),(80,5,75,16,NULL,'조립12'),(81,6,76,1,NULL,'가조립1'),(82,6,NULL,2,NULL,'가조립2'),(83,6,NULL,3,NULL,'가조립3'),(84,6,NULL,4,NULL,'가조립4'),(85,6,77,5,NULL,'조립1'),(86,6,78,6,NULL,'조립2'),(87,6,79,7,NULL,'조립3'),(88,6,80,8,NULL,'조립4'),(89,6,81,9,NULL,'조립5'),(90,6,82,10,NULL,'조립6'),(91,6,83,11,NULL,'조립7'),(92,6,84,12,NULL,'조립8'),(93,6,85,13,NULL,'조립9'),(94,6,86,14,NULL,'조립10'),(95,6,87,15,NULL,'조립11'),(96,6,88,16,NULL,'조립12'),(97,7,89,1,NULL,'가조립1'),(98,7,90,2,NULL,'가조립2'),(99,7,91,3,NULL,'가조립3'),(100,7,92,4,NULL,'조립1'),(101,7,93,5,NULL,'조립2'),(102,7,94,6,NULL,'조립3'),(103,7,95,7,NULL,'조립4'),(104,7,96,8,NULL,'조립5'),(105,7,97,9,NULL,'조립6'),(106,7,98,10,NULL,'조립7'),(107,7,99,11,NULL,'조립8'),(108,7,100,12,NULL,'조립9'),(109,7,101,13,NULL,'조립10'),(110,8,102,1,NULL,'가조립1'),(111,8,103,2,NULL,'가조립2'),(112,8,104,3,NULL,'가조립3'),(113,8,105,4,NULL,'조립1'),(114,8,106,5,NULL,'조립2'),(115,8,107,6,NULL,'조립3'),(116,8,108,7,NULL,'조립4'),(117,8,109,8,NULL,'조립5'),(118,8,110,9,NULL,'조립6'),(119,8,111,10,NULL,'조립7'),(120,8,112,11,NULL,'조립8'),(121,8,113,12,NULL,'조립9'),(122,8,114,13,NULL,'조립10'),(123,9,115,1,NULL,'가조립1'),(124,9,116,2,NULL,'가조립2'),(125,9,NULL,3,NULL,'가조립3'),(126,9,117,4,NULL,'조립1'),(127,9,118,5,NULL,'조립2'),(128,9,119,6,NULL,'조립3'),(129,9,120,7,NULL,'조립4'),(130,9,121,8,NULL,'조립5'),(131,9,122,9,NULL,'조립6'),(132,9,123,10,NULL,'조립7'),(133,9,124,11,NULL,'조립8'),(134,9,125,12,NULL,'조립9'),(135,9,126,13,NULL,'조립10'),(136,10,127,1,NULL,'가조립1'),(137,10,NULL,2,NULL,'가조립2'),(138,10,NULL,3,NULL,'가조립3'),(139,10,128,4,NULL,'조립1'),(140,10,129,5,NULL,'조립2'),(141,10,130,6,NULL,'조립3'),(142,10,131,7,NULL,'조립4'),(143,10,132,8,NULL,'조립5'),(144,10,133,9,NULL,'조립6'),(145,10,134,10,NULL,'조립7'),(146,10,135,11,NULL,'조립8'),(147,10,136,12,NULL,'조립9'),(148,10,137,13,NULL,'조립10'),(149,11,138,1,NULL,'가조립1'),(150,11,139,2,NULL,'가조립2'),(151,11,140,3,NULL,'가조립3'),(152,11,141,4,NULL,'조립1'),(153,11,142,5,NULL,'조립2'),(154,11,143,6,NULL,'조립3'),(155,11,144,7,NULL,'조립4'),(156,11,145,8,NULL,'조립5'),(157,11,146,9,NULL,'조립6'),(158,11,147,10,NULL,'조립7'),(159,11,148,11,NULL,'조립8'),(160,11,149,12,NULL,'조립9'),(161,11,150,13,NULL,'조립10'),(162,12,151,1,NULL,'가조립1'),(163,12,NULL,2,NULL,'가조립2'),(164,12,NULL,3,NULL,'가조립3'),(165,12,152,4,NULL,'조립1'),(166,12,153,5,NULL,'조립2'),(167,12,154,6,NULL,'조립3'),(168,12,155,7,NULL,'조립4'),(169,12,156,8,NULL,'조립5'),(170,12,157,9,NULL,'조립6'),(171,12,158,10,NULL,'조립7'),(172,12,159,11,NULL,'조립8'),(173,12,160,12,NULL,'조립9'),(174,12,161,13,NULL,'조립10'),(175,13,162,1,NULL,'가조립1'),(176,13,163,2,NULL,'가조립2'),(177,13,NULL,3,NULL,'가조립3'),(178,13,164,4,NULL,'조립1'),(179,13,165,5,NULL,'조립2'),(180,13,166,6,NULL,'조립3'),(181,13,167,7,NULL,'조립4'),(182,13,168,8,NULL,'조립5'),(183,13,169,9,NULL,'조립6'),(184,13,170,10,NULL,'조립7'),(185,13,171,11,NULL,'조립8'),(186,13,172,12,NULL,'조립9'),(187,13,173,13,NULL,'조립10'),(188,14,174,1,NULL,'가조립1'),(189,14,175,2,NULL,'가조립2'),(190,14,NULL,3,NULL,'가조립3'),(191,14,176,4,NULL,'조립1'),(192,14,177,5,NULL,'조립2'),(193,14,178,6,NULL,'조립3'),(194,14,179,7,NULL,'조립4'),(195,14,180,8,NULL,'조립5'),(196,14,181,9,NULL,'조립6'),(197,14,182,10,NULL,'조립7'),(198,14,183,11,NULL,'조립8'),(199,14,184,12,NULL,'조립9'),(200,14,185,13,NULL,'조립10');
/*!40000 ALTER TABLE `process_step` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work`
--

DROP TABLE IF EXISTS `work`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '작업 이름',
  `estimated_duration_sec` int unsigned NOT NULL DEFAULT '0' COMMENT '예상 소요시간(초)',
  `work_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '가조립|조립',
  `deleted_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_deleted` (`deleted_yn`)
) ENGINE=InnoDB AUTO_INCREMENT=186 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='작업';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work`
--

LOCK TABLES `work` WRITE;
/*!40000 ALTER TABLE `work` DISABLE KEYS */;
INSERT INTO `work` VALUES (1,'[G80 3세대 FRT (STD)] 가조립1',126,'가조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(2,'[G80 3세대 FRT (STD)] 가조립2',141,'가조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(3,'[G80 3세대 FRT (STD)] 조립1',45,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(4,'[G80 3세대 FRT (STD)] 조립2',65,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(5,'[G80 3세대 FRT (STD)] 조립3',43,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(6,'[G80 3세대 FRT (STD)] 조립4',30,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(7,'[G80 3세대 FRT (STD)] 조립5',32,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(8,'[G80 3세대 FRT (STD)] 조립6',33,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(9,'[G80 3세대 FRT (STD)] 조립7',30,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(10,'[G80 3세대 FRT (STD)] 조립8',30,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(11,'[G80 3세대 FRT (STD)] 조립9',40,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(12,'[G80 3세대 FRT (STD)] 조립10',15,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(13,'[G80 3세대 FRT (STD)] 조립11',25,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(14,'[G80 3세대 FRT (STD)] 조립12',30,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(15,'[G80 3세대 FRT (SPT)] 가조립1',126,'가조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(16,'[G80 3세대 FRT (SPT)] 가조립2',141,'가조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(17,'[G80 3세대 FRT (SPT)] 조립1',45,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(18,'[G80 3세대 FRT (SPT)] 조립2',65,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(19,'[G80 3세대 FRT (SPT)] 조립3',43,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(20,'[G80 3세대 FRT (SPT)] 조립4',30,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(21,'[G80 3세대 FRT (SPT)] 조립5',32,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(22,'[G80 3세대 FRT (SPT)] 조립6',33,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(23,'[G80 3세대 FRT (SPT)] 조립7',30,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(24,'[G80 3세대 FRT (SPT)] 조립8',30,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(25,'[G80 3세대 FRT (SPT)] 조립9',40,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(26,'[G80 3세대 FRT (SPT)] 조립10',15,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(27,'[G80 3세대 FRT (SPT)] 조립11',25,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(28,'[G80 3세대 FRT (SPT)] 조립12',30,'조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(29,'[G70 페이스리프트 FRT] 가조립1',74,'가조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(30,'[G70 페이스리프트 FRT] 가조립2',80,'가조립','N','2026-04-14 00:24:09','2026-04-14 00:24:09',NULL),(31,'[G70 페이스리프트 FRT] 가조립3',110,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(32,'[G70 페이스리프트 FRT] 가조립4',23,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(33,'[G70 페이스리프트 FRT] 조립1',45,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(34,'[G70 페이스리프트 FRT] 조립2',50,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(35,'[G70 페이스리프트 FRT] 조립3',100,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(36,'[G70 페이스리프트 FRT] 조립4',55,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(37,'[G70 페이스리프트 FRT] 조립5',38,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(38,'[G70 페이스리프트 FRT] 조립6',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(39,'[G70 페이스리프트 FRT] 조립7',10,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(40,'[G70 페이스리프트 FRT] 조립8',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(41,'[G70 페이스리프트 FRT] 조립9',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(42,'[G70 페이스리프트 FRT] 조립11',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(43,'[G70 페이스리프트 FRT] 조립12',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(44,'[G90 4세대 FRT] 가조립1',82,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(45,'[G90 4세대 FRT] 가조립2',88,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(46,'[G90 4세대 FRT] 가조립3',90,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(47,'[G90 4세대 FRT] 가조립4',93,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(48,'[G90 4세대 FRT] 조립1',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(49,'[G90 4세대 FRT] 조립2',50,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(50,'[G90 4세대 FRT] 조립3',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(51,'[G90 4세대 FRT] 조립4',90,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(52,'[G90 4세대 FRT] 조립5',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(53,'[G90 4세대 FRT] 조립6',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(54,'[G90 4세대 FRT] 조립7',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(55,'[G90 4세대 FRT] 조립8',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(56,'[G90 4세대 FRT] 조립9',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(57,'[G90 4세대 FRT] 조립10',20,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(58,'[G90 4세대 FRT] 조립11',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(59,'[G90 4세대 FRT] 조립12',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(60,'[G90 4세대 리무진 FRT] 가조립1',82,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(61,'[G90 4세대 리무진 FRT] 가조립2',98,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(62,'[G90 4세대 리무진 FRT] 가조립3',90,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(63,'[G90 4세대 리무진 FRT] 가조립4',93,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(64,'[G90 4세대 리무진 FRT] 조립1',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(65,'[G90 4세대 리무진 FRT] 조립2',50,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(66,'[G90 4세대 리무진 FRT] 조립3',32,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(67,'[G90 4세대 리무진 FRT] 조립4',90,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(68,'[G90 4세대 리무진 FRT] 조립5',50,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(69,'[G90 4세대 리무진 FRT] 조립6',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(70,'[G90 4세대 리무진 FRT] 조립7',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(71,'[G90 4세대 리무진 FRT] 조립8',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(72,'[G90 4세대 리무진 FRT] 조립9',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(73,'[G90 4세대 리무진 FRT] 조립10',20,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(74,'[G90 4세대 리무진 FRT] 조립11',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(75,'[G90 4세대 리무진 FRT] 조립12',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(76,'[펠리세이드 2세대 FRT] 가조립1',359,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(77,'[펠리세이드 2세대 FRT] 조립1',46,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(78,'[펠리세이드 2세대 FRT] 조립2',41,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(79,'[펠리세이드 2세대 FRT] 조립3',70,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(80,'[펠리세이드 2세대 FRT] 조립4',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(81,'[펠리세이드 2세대 FRT] 조립5',75,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(82,'[펠리세이드 2세대 FRT] 조립6',60,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(83,'[펠리세이드 2세대 FRT] 조립7',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(84,'[펠리세이드 2세대 FRT] 조립8',48,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(85,'[펠리세이드 2세대 FRT] 조립9',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(86,'[펠리세이드 2세대 FRT] 조립10',58,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(87,'[펠리세이드 2세대 FRT] 조립11',30,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(88,'[펠리세이드 2세대 FRT] 조립12',50,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(89,'[G80 3세대 RR (STD)] 가조립1',107,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(90,'[G80 3세대 RR (STD)] 가조립2',210,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(91,'[G80 3세대 RR (STD)] 가조립3',70,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(92,'[G80 3세대 RR (STD)] 조립1',54,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(93,'[G80 3세대 RR (STD)] 조립2',62,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(94,'[G80 3세대 RR (STD)] 조립3',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(95,'[G80 3세대 RR (STD)] 조립4',39,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(96,'[G80 3세대 RR (STD)] 조립5',21,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(97,'[G80 3세대 RR (STD)] 조립6',26,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(98,'[G80 3세대 RR (STD)] 조립7',45,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(99,'[G80 3세대 RR (STD)] 조립8',97,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(100,'[G80 3세대 RR (STD)] 조립9',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(101,'[G80 3세대 RR (STD)] 조립10',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(102,'[G80 3세대 RR (SPT)] 가조립1',107,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(103,'[G80 3세대 RR (SPT)] 가조립2',210,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(104,'[G80 3세대 RR (SPT)] 가조립3',70,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(105,'[G80 3세대 RR (SPT)] 조립1',29,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(106,'[G80 3세대 RR (SPT)] 조립2',44,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(107,'[G80 3세대 RR (SPT)] 조립3',27,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(108,'[G80 3세대 RR (SPT)] 조립4',27,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(109,'[G80 3세대 RR (SPT)] 조립5',21,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(110,'[G80 3세대 RR (SPT)] 조립6',26,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(111,'[G80 3세대 RR (SPT)] 조립7',45,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(112,'[G80 3세대 RR (SPT)] 조립8',97,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(113,'[G80 3세대 RR (SPT)] 조립9',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(114,'[G80 3세대 RR (SPT)] 조립10',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(115,'[G70 페이스리프트 RR] 가조립1',50,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(116,'[G70 페이스리프트 RR] 가조립2',44,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(117,'[G70 페이스리프트 RR] 조립1',32,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(118,'[G70 페이스리프트 RR] 조립2',34,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(119,'[G70 페이스리프트 RR] 조립3',22,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(120,'[G70 페이스리프트 RR] 조립4',12,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(121,'[G70 페이스리프트 RR] 조립5',15,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(122,'[G70 페이스리프트 RR] 조립6',12,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(123,'[G70 페이스리프트 RR] 조립7',26,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(124,'[G70 페이스리프트 RR] 조립8',41,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(125,'[G70 페이스리프트 RR] 조립9',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(126,'[G70 페이스리프트 RR] 조립10',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(127,'[G70 스포츠 RR] 가조립1',30,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(128,'[G70 스포츠 RR] 조립1',32,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(129,'[G70 스포츠 RR] 조립2',34,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(130,'[G70 스포츠 RR] 조립3',22,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(131,'[G70 스포츠 RR] 조립4',12,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(132,'[G70 스포츠 RR] 조립5',15,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(133,'[G70 스포츠 RR] 조립6',17,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(134,'[G70 스포츠 RR] 조립7',26,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(135,'[G70 스포츠 RR] 조립8',41,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(136,'[G70 스포츠 RR] 조립9',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(137,'[G70 스포츠 RR] 조립10',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(138,'[G90 4세대 RR] 가조립1',38,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(139,'[G90 4세대 RR] 가조립2',244,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(140,'[G90 4세대 RR] 가조립3',68,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(141,'[G90 4세대 RR] 조립1',49,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(142,'[G90 4세대 RR] 조립2',59,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(143,'[G90 4세대 RR] 조립3',21,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(144,'[G90 4세대 RR] 조립4',26,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(145,'[G90 4세대 RR] 조립5',20,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(146,'[G90 4세대 RR] 조립6',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(147,'[G90 4세대 RR] 조립7',45,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(148,'[G90 4세대 RR] 조립8',96,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(149,'[G90 4세대 RR] 조립9',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(150,'[G90 4세대 RR] 조립10',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(151,'[G90 4세대 리무진 RR] 가조립1',266,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(152,'[G90 4세대 리무진 RR] 조립1',49,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(153,'[G90 4세대 리무진 RR] 조립2',38,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(154,'[G90 4세대 리무진 RR] 조립3',21,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(155,'[G90 4세대 리무진 RR] 조립4',26,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(156,'[G90 4세대 리무진 RR] 조립5',20,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(157,'[G90 4세대 리무진 RR] 조립6',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(158,'[G90 4세대 리무진 RR] 조립7',45,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(159,'[G90 4세대 리무진 RR] 조립8',96,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(160,'[G90 4세대 리무진 RR] 조립9',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(161,'[G90 4세대 리무진 RR] 조립10',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(162,'[펠리세이드 2세대 RR] 가조립1',141,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(163,'[펠리세이드 2세대 RR] 가조립2',74,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(164,'[펠리세이드 2세대 RR] 조립1',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(165,'[펠리세이드 2세대 RR] 조립2',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(166,'[펠리세이드 2세대 RR] 조립3',18,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(167,'[펠리세이드 2세대 RR] 조립4',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(168,'[펠리세이드 2세대 RR] 조립5',10,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(169,'[펠리세이드 2세대 RR] 조립6',10,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(170,'[펠리세이드 2세대 RR] 조립7',70,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(171,'[펠리세이드 2세대 RR] 조립8',115,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(172,'[펠리세이드 2세대 RR] 조립9',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(173,'[펠리세이드 2세대 RR] 조립10',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(174,'[펠리세이드 2세대 캘리그래피 RR] 가조립1',116,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(175,'[펠리세이드 2세대 캘리그래피 RR] 가조립2',54,'가조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(176,'[펠리세이드 2세대 캘리그래피 RR] 조립1',40,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(177,'[펠리세이드 2세대 캘리그래피 RR] 조립2',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(178,'[펠리세이드 2세대 캘리그래피 RR] 조립3',18,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(179,'[펠리세이드 2세대 캘리그래피 RR] 조립4',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(180,'[펠리세이드 2세대 캘리그래피 RR] 조립5',10,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(181,'[펠리세이드 2세대 캘리그래피 RR] 조립6',10,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(182,'[펠리세이드 2세대 캘리그래피 RR] 조립7',70,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(183,'[펠리세이드 2세대 캘리그래피 RR] 조립8',115,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(184,'[펠리세이드 2세대 캘리그래피 RR] 조립9',25,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL),(185,'[펠리세이드 2세대 캘리그래피 RR] 조립10',35,'조립','N','2026-04-14 00:24:10','2026-04-14 00:24:10',NULL);
/*!40000 ALTER TABLE `work` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_machine`
--

DROP TABLE IF EXISTS `work_machine`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_machine` (
  `work_id` bigint unsigned NOT NULL,
  `machine_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`work_id`,`machine_id`),
  KEY `fk_work_machine_machine` (`machine_id`),
  CONSTRAINT `fk_work_machine_machine` FOREIGN KEY (`machine_id`) REFERENCES `machine` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_work_machine_work` FOREIGN KEY (`work_id`) REFERENCES `work` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_machine`
--

LOCK TABLES `work_machine` WRITE;
/*!40000 ALTER TABLE `work_machine` DISABLE KEYS */;
INSERT INTO `work_machine` VALUES (1,1),(15,1),(89,1),(90,1),(102,1),(103,1),(138,1),(139,1),(1,2),(15,2),(29,2),(44,2),(60,2),(1,3),(15,3),(44,3),(60,3),(89,3),(91,3),(102,3),(104,3),(138,3),(139,3),(163,3),(1,4),(15,4),(47,4),(63,4),(90,4),(103,4),(2,5),(16,5),(29,5),(30,5),(31,5),(139,5),(151,5),(2,6),(16,6),(31,6),(46,6),(47,6),(62,6),(63,6),(90,6),(103,6),(115,6),(139,6),(140,6),(2,7),(16,7),(91,7),(104,7),(13,8),(14,8),(27,8),(28,8),(42,8),(43,8),(58,8),(59,8),(74,8),(75,8),(87,8),(88,8),(100,8),(101,8),(113,8),(114,8),(125,8),(126,8),(136,8),(137,8),(149,8),(150,8),(160,8),(161,8),(172,8),(173,8),(184,8),(185,8),(29,9),(76,10),(140,10),(44,11),(60,11),(19,12),(45,12),(61,12),(89,13),(102,13),(139,13);
/*!40000 ALTER TABLE `work_machine` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_part`
--

DROP TABLE IF EXISTS `work_part`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_part` (
  `work_id` bigint unsigned NOT NULL,
  `part_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`work_id`,`part_id`),
  KEY `fk_work_part_part` (`part_id`),
  CONSTRAINT `fk_work_part_part` FOREIGN KEY (`part_id`) REFERENCES `part` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_work_part_work` FOREIGN KEY (`work_id`) REFERENCES `work` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_part`
--

LOCK TABLES `work_part` WRITE;
/*!40000 ALTER TABLE `work_part` DISABLE KEYS */;
INSERT INTO `work_part` VALUES (1,1),(2,1),(4,1),(14,1),(15,1),(16,1),(18,1),(28,1),(29,1),(34,1),(43,1),(44,1),(47,1),(49,1),(59,1),(60,1),(63,1),(65,1),(75,1),(78,1),(87,1),(88,1),(89,1),(90,1),(93,1),(100,1),(101,1),(102,1),(103,1),(106,1),(113,1),(114,1),(118,1),(125,1),(126,1),(129,1),(136,1),(137,1),(138,1),(139,1),(140,1),(142,1),(149,1),(150,1),(160,1),(161,1),(164,1),(172,1),(173,1),(176,1),(184,1),(185,1),(2,2),(16,2),(29,2),(46,2),(47,2),(62,2),(63,2),(76,2),(76,3),(141,3),(152,3),(162,3),(174,3),(162,4),(116,5),(116,6),(90,7),(103,7),(90,8),(103,8),(1,9),(7,9),(15,9),(21,9),(44,9),(60,9),(138,9),(139,9),(1,10),(15,10),(36,10),(37,10),(84,10),(1,11),(15,11),(36,11),(37,11),(84,11),(89,12),(102,12),(51,13),(67,13),(1,14),(15,14),(1,15),(15,15),(105,16),(106,16),(31,17),(45,17),(61,17),(31,18),(45,18),(61,18),(3,19),(4,19),(5,19),(6,19),(7,19),(8,19),(17,19),(18,19),(19,19),(20,19),(21,19),(22,19),(31,19),(33,19),(34,19),(36,19),(37,19),(38,19),(45,19),(48,19),(49,19),(50,19),(51,19),(52,19),(53,19),(61,19),(64,19),(65,19),(66,19),(67,19),(68,19),(69,19),(77,19),(79,19),(81,19),(82,19),(86,19),(1,20),(5,20),(7,20),(15,20),(19,20),(21,20),(1,21),(5,21),(7,21),(15,21),(19,21),(21,21),(78,22),(80,22),(1,23),(15,23),(45,23),(61,23),(83,23),(88,23),(91,23),(104,23),(139,23),(151,23),(175,23),(2,24),(16,24),(32,24),(47,24),(63,24),(76,24),(2,25),(16,25),(32,25),(3,26),(17,26),(33,26),(34,26),(48,27),(64,27),(48,28),(64,28),(77,29),(79,30),(77,31),(79,32),(77,33),(79,34),(3,35),(17,35),(48,35),(64,35),(92,35),(93,35),(141,35),(142,35),(152,35),(153,35),(4,36),(18,36),(6,37),(20,37),(80,37),(81,37),(94,37),(95,37),(107,37),(108,37),(143,37),(144,37),(154,37),(155,37),(95,38),(144,38),(155,38),(95,39),(144,39),(155,39),(35,40),(45,40),(61,40),(5,41),(19,41),(81,41),(82,41),(163,41),(175,41),(5,42),(19,42),(81,42),(82,42),(163,42),(175,42),(6,43),(20,43),(36,43),(80,43),(127,43),(133,43),(7,44),(21,44),(54,44),(70,44),(9,45),(10,45),(23,45),(24,45),(40,45),(54,45),(55,45),(70,45),(71,45),(83,45),(84,45),(11,46),(12,46),(25,46),(26,46),(41,46),(56,46),(57,46),(72,46),(73,46),(86,46),(13,47),(27,47),(42,47),(55,47),(58,47),(71,47),(74,47),(86,47),(98,47),(99,47),(111,47),(112,47),(123,47),(124,47),(134,47),(135,47),(147,47),(148,47),(158,47),(159,47),(170,47),(171,47),(182,47),(183,47),(9,48),(23,48),(39,48),(163,48),(11,49),(25,49),(41,49),(56,49),(72,49),(87,49),(88,49),(146,49),(157,49),(29,50),(30,50),(45,51),(61,51),(37,52),(37,53),(30,54),(30,55),(30,56),(37,56),(30,57),(31,57),(31,58),(30,59),(30,60),(76,61),(76,62),(76,63),(90,64),(92,64),(93,64),(103,64),(115,64),(117,64),(128,64),(162,64),(164,64),(174,64),(176,64),(76,65),(76,66),(47,67),(63,67),(76,67),(90,67),(103,67),(139,67),(76,68),(174,68),(76,69),(90,69),(103,69),(151,69),(76,70),(90,70),(103,70),(151,70),(140,71),(162,71),(174,71),(140,72),(162,72),(174,72),(76,73),(165,73),(177,73),(76,74),(76,75),(140,76),(140,77),(77,78),(79,79),(77,80),(79,81),(77,82),(79,83),(78,84),(78,85),(78,86),(80,87),(78,88),(80,89),(78,90),(80,91),(50,92),(66,92),(81,92),(50,93),(66,93),(81,93),(83,94),(85,95),(47,96),(63,96),(47,97),(63,97),(52,98),(68,98),(59,99),(75,99),(68,100),(92,100),(93,100),(151,100),(115,101),(139,101),(116,102),(151,102),(163,103),(175,103),(163,104),(175,104),(116,105),(138,105),(151,105),(162,105),(174,105),(90,106),(103,106),(116,106),(140,106),(151,106),(90,107),(103,107),(116,107),(140,107),(151,107),(89,108),(102,108),(140,108),(89,109),(102,109),(138,109),(151,109),(89,110),(102,110),(138,110),(151,110),(89,111),(102,111),(92,112),(93,112),(105,112),(106,112),(117,112),(118,112),(128,112),(129,112),(141,112),(142,112),(152,112),(153,112),(162,112),(174,112),(90,113),(103,113),(116,113),(140,113),(151,113),(90,114),(103,114),(116,114),(140,114),(151,114),(92,115),(93,115),(90,116),(103,116),(90,117),(103,117),(116,118),(123,118),(134,118),(148,118),(159,118),(164,118),(165,118),(171,118),(176,118),(177,118),(183,118),(163,119),(175,119),(163,120),(175,120),(107,121),(108,121),(119,121),(120,121),(130,121),(131,121),(143,121),(144,121),(154,121),(155,121),(105,122),(117,122),(128,122),(141,122),(152,122),(105,123),(117,123),(128,123),(141,123),(152,123),(117,124),(128,124),(117,125),(128,125),(105,126),(106,126),(118,126),(129,126),(142,126),(153,126),(166,126),(178,126),(118,127),(129,127),(96,128),(97,128),(109,128),(110,128),(119,128),(121,128),(122,128),(130,128),(132,128),(133,128),(145,128),(146,128),(156,128),(157,128),(168,128),(169,128),(180,128),(181,128),(96,129),(109,129),(145,129),(156,129),(166,129),(178,129),(96,130),(109,130),(145,130),(156,130),(166,130),(178,130),(96,131),(97,131),(109,131),(110,131),(121,131),(122,131),(132,131),(133,131),(145,131),(146,131),(156,131),(157,131),(99,132),(112,132),(124,132),(135,132),(148,132),(159,132),(171,132),(183,132),(98,133),(99,133),(111,133),(112,133),(124,133),(135,133),(147,133),(158,133),(164,134),(165,134),(176,134),(177,134),(165,135),(177,135),(165,136),(177,136),(166,137),(167,137),(178,137),(179,137),(166,138),(178,138),(167,139),(179,139),(163,140),(163,141),(163,142),(163,143),(141,144),(142,144),(152,144),(153,144),(141,145),(142,145),(152,145),(153,145),(151,146),(151,147),(94,148),(95,148),(107,148),(108,148);
/*!40000 ALTER TABLE `work_part` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_step`
--

DROP TABLE IF EXISTS `work_step`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_step` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_id` bigint unsigned NOT NULL,
  `step_order` int unsigned NOT NULL DEFAULT '0',
  `step_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '세부 공정 이름',
  `duration_min` int unsigned DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_work_step_work` (`work_id`),
  CONSTRAINT `fk_work_step_work` FOREIGN KEY (`work_id`) REFERENCES `work` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=634 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='작업 세부 단계';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_step`
--

LOCK TABLES `work_step` WRITE;
/*!40000 ALTER TABLE `work_step` DISABLE KEYS */;
INSERT INTO `work_step` VALUES (1,1,1,'펀칭장비 이동',3,NULL),(2,1,2,'센서홀더 L/R 체결',3,NULL),(3,1,3,'범퍼 가서열대 이동',5,NULL),(4,1,4,'펀칭 장비 범퍼 로딩',5,NULL),(5,1,5,'센서홀더 융착 및 펀칭',55,NULL),(6,1,6,'지그(U자) 로딩',5,NULL),(7,1,7,'사이드브라켓 L/R 장착',5,NULL),(8,1,8,'스크류 L/R 각 2개소 체결',10,NULL),(9,1,9,'센서 2개소 체결',30,NULL),(10,1,10,'H지그 이동',5,NULL),(11,2,1,'H지그 → 초음파 장비 범퍼 로딩',8,NULL),(12,2,2,'초음파 센서 장비 융착',80,NULL),(13,2,3,'범퍼그릴 이동 및 로딩',10,NULL),(14,2,4,'지그(N자) 로딩',5,NULL),(15,2,5,'범퍼그릴 장착',8,NULL),(16,2,6,'라지에이터 그릴 장착',20,NULL),(17,2,7,'SCC 장착',3,NULL),(18,2,8,'서브 컨베어 이동',7,NULL),(19,3,1,'에어덕트 장착',10,NULL),(20,3,2,'UWB 체결',10,NULL),(21,3,3,'에어덕트 RH 스크류 8개소 체결',25,NULL),(22,4,1,'범퍼 로딩',10,NULL),(23,4,2,'사이드 덕트 장착',25,NULL),(24,4,3,'RH부 하단 스크류 8개소 체결',30,NULL),(25,5,1,'코너레이더 L/R 스크류 각 3개소 체결',8,NULL),(26,5,2,'에어덕트 LH 스크류 8개소 체결',20,NULL),(27,5,3,'브라켓 L/R 리벳 각 4개소 체결',15,NULL),(28,6,1,'사이드 덕트 LH 스크류 4개소 체결',15,NULL),(29,6,2,'코너레이더 로딩',10,NULL),(30,6,3,'카메라 로딩',5,NULL),(31,7,1,'센서홀더 체결',7,NULL),(32,7,2,'센서 홀더 L/R 스크류 각 2개소 체결',5,NULL),(33,7,3,'라지에이터 그릴 상단 스크류 8개소 체결',15,NULL),(34,7,4,'공용센서 2개 체결',5,NULL),(35,8,1,'카메라 스크류 3개소 체결',5,NULL),(36,8,2,'SCC 스크류 2개소 체결',5,NULL),(37,8,3,'라지에이터 그릴 하단 스크류 6개소 체결',23,NULL),(38,9,1,'센터 센서 2개소 체결',10,NULL),(39,9,2,'와이어링 RH 체결',20,NULL),(40,10,1,'와이어링 RH 체결',30,NULL),(41,11,1,'와이어링 LH 체결',25,NULL),(42,11,2,'E/ABS 체결',15,NULL),(43,12,1,'와이어링 LH 체결',15,NULL),(44,13,1,'와이어링 통전 검사',25,NULL),(45,14,1,'내부검사',20,NULL),(46,14,2,'조립이종 검사',10,NULL),(47,15,1,'펀칭장비 이동',3,NULL),(48,15,2,'센서홀더 L/R 체결',3,NULL),(49,15,3,'범퍼 가서열대 이동',5,NULL),(50,15,4,'펀칭 장비 범퍼 로딩',5,NULL),(51,15,5,'센서홀더 융착 및 펀칭',55,NULL),(52,15,6,'지그(U자) 로딩',5,NULL),(53,15,7,'사이드브라켓 L/R 장착',5,NULL),(54,15,8,'스크류 L/R 각 2개소 체결',10,NULL),(55,15,9,'센서 2개소 체결',30,NULL),(56,15,10,'H지그 이동',5,NULL),(57,16,1,'H지그 → 초음파 장비 범퍼 로딩',8,NULL),(58,16,2,'초음파 센서 장비 융착',80,NULL),(59,16,3,'범퍼그릴 이동 및 로딩',10,NULL),(60,16,4,'지그(N자) 로딩',5,NULL),(61,16,5,'범퍼그릴 장착',8,NULL),(62,16,6,'라지에이터 그릴 장착',20,NULL),(63,16,7,'SCC 장착',3,NULL),(64,16,8,'서브 컨베어 이동',7,NULL),(65,17,1,'에어덕트 장착',10,NULL),(66,17,2,'UWB 체결',10,NULL),(67,17,3,'에어덕트 RH 스크류 8개소 체결',25,NULL),(68,18,1,'범퍼 로딩',10,NULL),(69,18,2,'사이드 덕트 장착',25,NULL),(70,18,3,'RH부 하단 스크류 8개소 체결',30,NULL),(71,19,1,'코너레이더 L/R 스크류 각 3개소 체결',8,NULL),(72,19,2,'에어덕트 LH 스크류 8개소 체결',20,NULL),(73,19,3,'브라켓 L/R 리벳 각 4개소 체결',15,NULL),(74,20,1,'사이드 덕트 LH 스크류 4개소 체결',15,NULL),(75,20,2,'코너레이더 로딩',10,NULL),(76,20,3,'카메라 로딩',5,NULL),(77,21,1,'센서홀더 체결',7,NULL),(78,21,2,'센서 홀더 L/R 스크류 각 2개소 체결',5,NULL),(79,21,3,'라지에이터 그릴 상단 스크류 8개소 체결',15,NULL),(80,21,4,'공용센서 2개 체결',5,NULL),(81,22,1,'카메라 스크류 3개소 체결',5,NULL),(82,22,2,'SCC 스크류 2개소 체결',5,NULL),(83,22,3,'라지에이터 그릴 하단 스크류 6개소 체결',23,NULL),(84,23,1,'센터 센서 2개소 체결',10,NULL),(85,23,2,'와이어링 RH 체결',20,NULL),(86,24,1,'와이어링 RH 체결',30,NULL),(87,25,1,'와이어링 LH 체결',25,NULL),(88,25,2,'E/ABS 체결',15,NULL),(89,26,1,'와이어링 LH 체결',15,NULL),(90,27,1,'와이어링 통전 검사',25,NULL),(91,28,1,'내부검사',20,NULL),(92,28,2,'조립이종 검사',10,NULL),(93,29,1,'압입기 범퍼그릴 로딩',7,NULL),(94,29,2,'범퍼 가서열대 이동',5,NULL),(95,29,3,'압입기 범퍼 로딩',7,NULL),(96,29,4,'엠블럼 펀칭',45,NULL),(97,29,5,'헤드램프 초음파 장비 로딩',10,NULL),(98,30,1,'사이드 그릴 L/R 장착',15,NULL),(99,30,2,'헤드램프 로워 마운팅 브라켓 L/R 장착',8,NULL),(100,30,3,'엠블럼 장착',5,NULL),(101,30,4,'헤드램프 초음파 장비 융착',45,NULL),(102,30,5,'REINF 초음파 장비 로딩',7,NULL),(103,31,1,'소프트 장착',10,NULL),(104,31,2,'사이드 어퍼 브라켓 L/R 장착',5,NULL),(105,31,3,'스크류 12개소 체결',45,NULL),(106,31,4,'REINF 초음파 장비 융착',40,NULL),(107,31,5,'지그(N자) 이동',10,NULL),(108,32,1,'라지에이터 그릴 장착',20,NULL),(109,32,2,'SCC 장착',3,NULL),(110,33,1,'에어덕트 장착',10,NULL),(111,33,2,'SCC 스크류 2개소 체결',5,NULL),(112,33,3,'라지에이터 그릴 스크류 8개소 체결',20,NULL),(113,33,4,'에어덕트 RH 스크류 4개소 체결',10,NULL),(114,34,1,'범퍼 로딩',10,NULL),(115,34,2,'에어덕트 장착',25,NULL),(116,34,3,'에어덕트 RH 스크류 4개소 체결',15,NULL),(117,35,1,'리벳 26개소 체결',100,NULL),(118,36,1,'카메라 장착',10,NULL),(119,36,2,'센서홀더 L/R 장착',5,NULL),(120,36,3,'LH부 스크류 14개소 체결',40,NULL),(121,37,1,'LH 스크류 2개소 체결',10,NULL),(122,37,2,'엠블럼 장착',6,NULL),(123,37,3,'헤드램프 브라켓 L/R 각 1개소 융착',5,NULL),(124,37,4,'센서홀더 L/R 각 2개소 융착',17,NULL),(125,38,1,'엠블럼 스크류 3개소 체결',5,NULL),(126,38,2,'라지에이터 그릴 LH 스크류 6개소 체결',15,NULL),(127,38,3,'카메라 스크류 2개소 체결',5,NULL),(128,38,4,'센서홀더 스크류 4개소 체결',10,NULL),(129,39,1,'센터 센서 2개소 체결',10,NULL),(130,40,1,'와이어링 RH 체결',30,NULL),(131,41,1,'와이어링 LH 체결',20,NULL),(132,41,2,'E/ABS 체결',15,NULL),(133,42,1,'와이어링 통전 검사',25,NULL),(134,43,1,'내부검사',20,NULL),(135,43,2,'조립이종 검사',10,NULL),(136,44,1,'RSPA장비 센서홀더 2개소 체결',6,NULL),(137,44,2,'범퍼 가서열대 이동',10,NULL),(138,44,3,'범퍼 RSPA 장비 이동 및 로딩',16,NULL),(139,44,4,'장비 융착',40,NULL),(140,44,5,'지그(U자) 이동 및 로딩',10,NULL),(141,45,1,'센서 2개소 체결',20,NULL),(142,45,2,'사이드 어퍼 브라켓 L/R 체결',8,NULL),(143,45,3,'브라켓 스크류 6개소 체결',30,NULL),(144,45,4,'리벳 2개소 체결',15,NULL),(145,45,5,'헤드램프 브라켓 장비 로딩',15,NULL),(146,46,1,'장비 융착',60,NULL),(147,46,2,'N지그 범퍼그릴 로딩 이동',20,NULL),(148,46,3,'범퍼그릴 로딩',10,NULL),(149,47,1,'범퍼 N지그 로딩',10,NULL),(150,47,2,'범퍼그릴 체결',15,NULL),(151,47,3,'센터몰딩 체결',15,NULL),(152,47,4,'FRT 몰딩 체결 L/R',15,NULL),(153,47,5,'라지에이터 그릴 체결',30,NULL),(154,47,6,'H지그 이동',8,NULL),(155,48,1,'에어덕트 L/R 장착',5,NULL),(156,48,2,'UWB 체결',10,NULL),(157,48,3,'라지에이터 그릴 LH 스크류 7개소 체결',20,NULL),(158,49,1,'범퍼 로딩',10,NULL),(159,49,2,'에어덕트 LH 스크류 12개소 체결',40,NULL),(160,50,1,'사이드 로워 브라켓 L/R 로딩',10,NULL),(161,50,2,'센서홀더 RH부 스크류 2개소 체결',5,NULL),(162,50,3,'사이드 로워 브라켓 R 스크류 3개소 체결',10,NULL),(163,50,4,'코너레이더 스크류 6개소 체결',15,NULL),(164,51,1,'센서홀더/카메라/코너레이더 로딩',30,NULL),(165,51,2,'사이드 로워 브라켓 L 스크류 3개소 체결',10,NULL),(166,51,3,'LH부 스크류 16개소 체결',50,NULL),(167,52,1,'센터브라켓 체결',10,NULL),(168,52,2,'LH부 스크류 8개소 체결',30,NULL),(169,53,1,'LH부 스크류 11개소 체결',30,NULL),(170,54,1,'공용센서 체결',10,NULL),(171,54,2,'와이어링 RH 체결',15,NULL),(172,55,1,'와이어링 로딩',15,NULL),(173,55,2,'와이어링 RH 체결',25,NULL),(174,56,1,'와이어링 LH 체결',15,NULL),(175,56,2,'E/ABS 체결',15,NULL),(176,57,1,'와이어링 LH 체결',20,NULL),(177,58,1,'와이어링 통전 검사',25,NULL),(178,59,1,'내부 검사',20,NULL),(179,59,2,'조립이종 검사',10,NULL),(180,59,3,'사이드 센서 체결',10,NULL),(181,60,1,'RSPA장비 센서홀더 2개소 체결',6,NULL),(182,60,2,'범퍼 가서열대 이동',10,NULL),(183,60,3,'범퍼 RSPA 장비 이동 및 로딩',16,NULL),(184,60,4,'장비 융착',40,NULL),(185,60,5,'지그(U자) 이동 및 로딩',10,NULL),(186,61,1,'센서 2개소 체결',20,NULL),(187,61,2,'사이드 어퍼 브라켓 L/R 체결',8,NULL),(188,61,3,'브라켓 스크류 8개소 체결',40,NULL),(189,61,4,'리벳 2개소 체결',15,NULL),(190,61,5,'헤드램프 브라켓 장비 로딩',15,NULL),(191,62,1,'장비 융착',60,NULL),(192,62,2,'N지그 범퍼그릴 로딩 이동',20,NULL),(193,62,3,'범퍼그릴 로딩',10,NULL),(194,63,1,'범퍼 N지그 로딩',10,NULL),(195,63,2,'범퍼그릴 체결',15,NULL),(196,63,3,'센터몰딩 체결',15,NULL),(197,63,4,'FRT 몰딩 체결 L/R',15,NULL),(198,63,5,'라지에이터 그릴 체결',30,NULL),(199,63,6,'H지그 이동',8,NULL),(200,64,1,'에어덕트 L/R 장착',5,NULL),(201,64,2,'UWB 체결',10,NULL),(202,64,3,'라지에이터 그릴 LH 스크류 7개소 체결',20,NULL),(203,65,1,'범퍼 로딩',10,NULL),(204,65,2,'에어덕트 LH 스크류 12개소 체결',40,NULL),(205,66,1,'사이드 로워 브라켓 L/R 로딩',10,NULL),(206,66,2,'센서홀더 RH부 스크류 2개소 체결',5,NULL),(207,66,3,'사이드 로워 브라켓 R 스크류 3개소 체결',10,NULL),(208,66,4,'코너레이더 스크류 3개소 체결',7,NULL),(209,67,1,'센서홀더/카메라/코너레이더 로딩',30,NULL),(210,67,2,'사이드 로워 브라켓 L 스크류 3개소 체결',10,NULL),(211,67,3,'LH부 스크류 16개소 체결',50,NULL),(212,68,1,'센터브라켓 체결',10,NULL),(213,68,2,'LH부 스크류 5개소 체결',20,NULL),(214,68,3,'홀더 융착',20,NULL),(215,69,1,'LH부 스크류 11개소 체결',30,NULL),(216,70,1,'공용센서 체결',10,NULL),(217,70,2,'와이어링 RH 체결',15,NULL),(218,71,1,'와이어링 로딩',15,NULL),(219,71,2,'와이어링 RH 체결',25,NULL),(220,72,1,'와이어링 LH 체결',15,NULL),(221,72,2,'E/ABS 체결',15,NULL),(222,73,1,'와이어링 LH 체결',20,NULL),(223,74,1,'와이어링 통전 검사',25,NULL),(224,75,1,'내부 검사',20,NULL),(225,75,2,'조립이종 검사',10,NULL),(226,75,3,'사이드 센서 체결',10,NULL),(227,76,1,'범퍼그릴 로딩',18,NULL),(228,76,2,'범퍼로워 로딩',50,NULL),(229,76,3,'범퍼로워 체결',12,NULL),(230,76,4,'어퍼 L/R 로딩',8,NULL),(231,76,5,'어퍼 센서 체결',40,NULL),(232,76,6,'어퍼 L/R 체결',8,NULL),(233,76,7,'스키드 L/R 체결',20,NULL),(234,76,8,'라지에이터 그릴 체결',35,NULL),(235,76,9,'센터몰딩 체결',20,NULL),(236,76,10,'센터 스키드 체결',35,NULL),(237,76,11,'사이드 몰딩 L/R 장착',25,NULL),(238,76,12,'립 체결',30,NULL),(239,76,13,'토잉캡 체결',15,NULL),(240,76,14,'보호랩 5개소 부착',35,NULL),(241,76,15,'버퍼컨베어 로딩',8,NULL),(242,77,1,'너트스프링 RH 1개소 체결',2,NULL),(243,77,2,'센터 브라켓 RH 체결',6,NULL),(244,77,3,'에어덕트 피스/에어덕트/램프 RH 로딩',10,NULL),(245,77,4,'에어덕트 피스 RH 체결',5,NULL),(246,77,5,'에어덕트 RH 체결',6,NULL),(247,77,6,'사이드램프 RH 장착',5,NULL),(248,77,7,'사이드 램프 스크류 3개소 체결',12,NULL),(249,78,1,'범퍼 로딩',10,NULL),(250,78,2,'플랜 브라켓 L/R 로딩',3,NULL),(251,78,3,'육각 스크류 RH 2개소 체결',10,NULL),(252,78,4,'플랜지 브라켓 RH 체결',5,NULL),(253,78,5,'클립훼스너 RH 2개소 체결',8,NULL),(254,78,6,'푸쉬 너트 RH 1개소 체결',5,NULL),(255,79,1,'너트스프링 LH 1개소 체결',2,NULL),(256,79,2,'센터 브라켓 LH 체결',5,NULL),(257,79,3,'에어덕트 피스/에어덕트/램프 LH 로딩',10,NULL),(258,79,4,'에어덕트 피스 LH 체결',3,NULL),(259,79,5,'에어덕트 LH 체결',5,NULL),(260,79,6,'사이드 램프 LH 장착',5,NULL),(261,79,7,'사이드 램프 스크류 3개소 체결',10,NULL),(262,79,8,'스크류 11개소 체결',30,NULL),(263,80,1,'육각 스크류 LH 2개소 체결',7,NULL),(264,80,2,'플랜지 브라켓 LH 체결',5,NULL),(265,80,3,'클립 훼스너 LH 2개소 체결',8,NULL),(266,80,4,'푸쉬 너트 LH 1개소 체결',5,NULL),(267,80,5,'코너레이더 로딩',5,NULL),(268,80,6,'카메라 장착 로딩',5,NULL),(269,81,1,'사이드 로워 브라켓 L/R 로딩',5,NULL),(270,81,2,'코너레이더 체결',10,NULL),(271,81,3,'상단부 L/R 리벳 각 2개소 체결',10,NULL),(272,81,4,'RH부 스크류 17개소 체결',50,NULL),(273,82,1,'상단부 L/R 리벳 각 2개소 체결',10,NULL),(274,82,2,'LH부 스크류 17개소 체결',50,NULL),(275,83,1,'센서 로딩',5,NULL),(276,83,2,'라지에이터 어퍼 장착',15,NULL),(277,83,3,'와이어링 RH 체결',10,NULL),(278,84,1,'센서홀더 L/R 체결',5,NULL),(279,84,2,'와이어링 RH 장착',40,NULL),(280,84,3,'센서 RH 와이어링 체결',3,NULL),(281,85,1,'웨자스트립 장착',30,NULL),(282,86,1,'라지에이터 어퍼 센서홀더 스크류 9개소 체결',30,NULL),(283,86,2,'와이어링 장착',25,NULL),(284,86,3,'센서 LH 와이어링 체결',3,NULL),(285,87,1,'E/ABS 로딩',5,NULL),(286,87,2,'통전검사',25,NULL),(287,88,1,'내부검사',20,NULL),(288,88,2,'조립이종 검사',15,NULL),(289,88,3,'센서 체결',5,NULL),(290,88,4,'E/ABS 체결',10,NULL),(291,89,1,'번호판 리딩&펀칭 장비 로딩',10,NULL),(292,89,2,'번호판 펀칭',35,NULL),(293,89,3,'너트 스프링 1개소 체결',8,NULL),(294,89,4,'U조립지그 로딩',5,NULL),(295,89,5,'UWB 브라켓 L/R 체결',7,NULL),(296,89,6,'코너레이더 브라켓 및 리벳 4개소 체결',17,NULL),(297,89,7,'펀칭 장비 센서 홀더 6개소 체결',25,NULL),(298,90,1,'펀칭 장비 범퍼 로딩',15,NULL),(299,90,2,'장비 펀칭',100,NULL),(300,90,3,'N지그 로딩',5,NULL),(301,90,4,'범퍼 몰딩 및 어퍼 L/R 체결',10,NULL),(302,90,5,'리플렉터 L/R 체결',5,NULL),(303,90,6,'사이드 몰딩 L/R 체결',8,NULL),(304,90,7,'센타몰딩 체결',12,NULL),(305,90,8,'번호판 램프 L/R 체결',3,NULL),(306,90,9,'도장 센터몰딩류 L/R 체결',30,NULL),(307,90,10,'스키드 체결',10,NULL),(308,90,11,'H지그 이동',12,NULL),(309,91,1,'U지그 로딩',5,NULL),(310,91,2,'센서 체결 및 검사',60,NULL),(311,91,3,'서브컨베어 로딩',5,NULL),(312,92,1,'UWB 로딩',5,NULL),(313,92,2,'UWB LH 체결',3,NULL),(314,92,3,'센타도장몰딩 스크류 9개소 체결',27,NULL),(315,92,4,'스키드 스크류 1개소 체결',3,NULL),(316,92,5,'리플렉터 스크류 3개소',10,NULL),(317,92,6,'홀더 스크류 2개소',6,NULL),(318,93,1,'범퍼로딩',10,NULL),(319,93,2,'UWB RH 체결',3,NULL),(320,93,3,'홀더 스크류 2개소',6,NULL),(321,93,4,'센타도장몰딩 스크류 9개소 체결',30,NULL),(322,93,5,'스키드 스크류 1개소',3,NULL),(323,93,6,'리플렉터 스크류 3개소',10,NULL),(324,94,1,'코너레이더 RH 스크류 3개소',10,NULL),(325,94,2,'사이드몰딩 RH 스크류 2개소',6,NULL),(326,94,3,'사이드몰딩 RH 단차 수정',24,NULL),(327,95,1,'코너레이더 L/R 로딩',3,NULL),(328,95,2,'코너레이더 LH 스크류 3개소',10,NULL),(329,95,3,'사이드몰딩 LH 스크류 2개소',6,NULL),(330,95,4,'사이드몰딩 LH 단차 수정',20,NULL),(331,96,1,'램프 L/R 로딩',5,NULL),(332,96,2,'램프 LH 스크류 4개소 체결',10,NULL),(333,96,3,'포그램프 스크류 2개소 체결',6,NULL),(334,97,1,'램프 LH 스크류 4개소 체결',10,NULL),(335,97,2,'포그램프 로딩',10,NULL),(336,97,3,'포그램프 2개소 체결',6,NULL),(337,98,1,'와이어링 로딩',10,NULL),(338,98,2,'와이어링 센타 체결',30,NULL),(339,98,3,'백빔 리테이너 2개소 체결',5,NULL),(340,99,1,'백빔 로딩',10,NULL),(341,99,2,'백빔 리테이너 3개소 체결',7,NULL),(342,99,3,'와이어링 LH 체결',40,NULL),(343,99,4,'와이어링 RH 체결',40,NULL),(344,100,1,'통전검사',25,NULL),(345,101,1,'내부 및 조립이종 검사',35,NULL),(346,102,1,'번호판 리딩&펀칭 장비 로딩',10,NULL),(347,102,2,'번호판 펀칭',35,NULL),(348,102,3,'너트 스프링 1개소 체결',8,NULL),(349,102,4,'U조립지그 로딩',5,NULL),(350,102,5,'UWB 브라켓 L/R 체결',7,NULL),(351,102,6,'코너레이더 브라켓 및 리벳 4개소 체결',17,NULL),(352,102,7,'펀칭 장비 센서 홀더 6개소 체결',25,NULL),(353,103,1,'펀칭 장비 범퍼 로딩',15,NULL),(354,103,2,'장비 펀칭',100,NULL),(355,103,3,'N지그 로딩',5,NULL),(356,103,4,'범퍼 몰딩 및 어퍼 L/R 체결',10,NULL),(357,103,5,'리플렉터 L/R 체결',5,NULL),(358,103,6,'사이드 몰딩 L/R 체결',8,NULL),(359,103,7,'센타몰딩 체결',12,NULL),(360,103,8,'번호판 램프 L/R 체결',3,NULL),(361,103,9,'도장 센터몰딩류 L/R 체결',30,NULL),(362,103,10,'스키드 체결',10,NULL),(363,103,11,'H지그 이동',12,NULL),(364,104,1,'U지그 로딩',5,NULL),(365,104,2,'센서 체결 및 검사',60,NULL),(366,104,3,'서브컨베어 로딩',5,NULL),(367,105,1,'테일트림 L/R 로딩',5,NULL),(368,105,2,'로워 스크류 3개소 체결',9,NULL),(369,105,3,'리플렉터 스크류 2개소 체결',6,NULL),(370,105,4,'사이드브라켓 LH 스크류 3개소 체결',9,NULL),(371,106,1,'범퍼로딩',10,NULL),(372,106,2,'로워 RH 스크류 3개소 체결',9,NULL),(373,106,3,'리플렉터 스크류 2개소 체결',6,NULL),(374,106,4,'사이드브라켓 로딩',10,NULL),(375,106,5,'사이드브라켓 RH 스크류 3개소',9,NULL),(376,107,1,'테일트림 LH 스크류 4개소',12,NULL),(377,107,2,'코너레이더 RH 스크류 3개소',9,NULL),(378,107,3,'사이드몰딩 LH 스크류 2개소',6,NULL),(379,108,1,'테일트림 RH 스크류 4개소',12,NULL),(380,108,2,'코너레이더 LH 스크류 3개소',9,NULL),(381,108,3,'사이드몰딩 RH 스크류 2개소',6,NULL),(382,109,1,'램프 L/R 로딩',5,NULL),(383,109,2,'램프 LH 스크류 4개소 체결',10,NULL),(384,109,3,'포그램프 스크류 2개소 체결',6,NULL),(385,110,1,'램프 LH 스크류 4개소 체결',10,NULL),(386,110,2,'포그램프 로딩',10,NULL),(387,110,3,'포그램프 2개소 체결',6,NULL),(388,111,1,'와이어링 로딩',10,NULL),(389,111,2,'와이어링 센타 체결',30,NULL),(390,111,3,'백빔 리테이너 2개소 체결',5,NULL),(391,112,1,'백빔 로딩',10,NULL),(392,112,2,'백빔 리테이너 3개소 체결',7,NULL),(393,112,3,'와이어링 LH 체결',40,NULL),(394,112,4,'와이어링 RH 체결',40,NULL),(395,113,1,'통전검사',25,NULL),(396,114,1,'내부 및 조립이종 검사',35,NULL),(397,115,1,'LWR 장비 로딩 및 펀칭',10,NULL),(398,115,2,'N지그 이동 및 로딩',5,NULL),(399,115,3,'스키드 체결',25,NULL),(400,115,4,'N지그 이동 및 로딩',10,NULL),(401,116,1,'범퍼몰딩 L/R 체결',8,NULL),(402,116,2,'리플렉터 L/R 체결',8,NULL),(403,116,3,'리테이너 2개소 체결',5,NULL),(404,116,4,'번호판 램프 L/R 체결',3,NULL),(405,116,5,'스프링너트 2개소 체결',10,NULL),(406,116,6,'부직포 2개소 부착',10,NULL),(407,117,1,'테일트림 L/R 로딩',5,NULL),(408,117,2,'언더커버 스크류 LH 4개소 체결',12,NULL),(409,117,3,'사이드덕트 스크류 LH 2개소 체결',6,NULL),(410,117,4,'스키드 스크류 LH 1개소 체결',3,NULL),(411,117,5,'리플렉터 스크류 LH 2개소 체결',6,NULL),(412,118,1,'범퍼로딩',10,NULL),(413,118,2,'로워 스크류 4개소 체결',12,NULL),(414,118,3,'리플렉터 스크류 2개소 체결',6,NULL),(415,118,4,'사이드 RH 스크류 2개소 체결',6,NULL),(416,119,1,'램프로딩',10,NULL),(417,119,2,'테일트림 LH 스크류 4개소 체결',12,NULL),(418,120,1,'테일트림 RH 스크류 4개소 체결',12,NULL),(419,121,1,'램프 RH 스크류 3개소 체결',9,NULL),(420,121,2,'포그램프 스크류 2개소 체결',6,NULL),(421,122,1,'램프 LH 스크류 3개소 체결',9,NULL),(422,122,2,'포그램프 스크류 1개소 체결',3,NULL),(423,123,1,'와이어링 로딩',10,NULL),(424,123,2,'와이어링 센터 체결',10,NULL),(425,123,3,'리테이너 2개소 체결',6,NULL),(426,124,1,'백빔 로딩',10,NULL),(427,124,2,'백빔 리테이너 3개소 체결',7,NULL),(428,124,3,'와이어링 LH 체결',12,NULL),(429,124,4,'와이어링 RH 체결',12,NULL),(430,125,1,'통전검사',25,NULL),(431,126,1,'내부 및 조립이종 검사',35,NULL),(432,127,1,'카메라 펀칭&융착',30,NULL),(433,128,1,'테일트림 L/R 로딩',5,NULL),(434,128,2,'언더커버 스크류 LH 4개소 체결',12,NULL),(435,128,3,'사이드덕트 스크류 LH 2개소 체결',6,NULL),(436,128,4,'스키드 스크류 LH 1개소 체결',3,NULL),(437,128,5,'리플렉터 스크류 LH 2개소 체결',6,NULL),(438,129,1,'범퍼로딩',10,NULL),(439,129,2,'로워 스크류 4개소 체결',12,NULL),(440,129,3,'리플렉터 스크류 2개소 체결',6,NULL),(441,129,4,'사이드 RH 스크류 2개소 체결',6,NULL),(442,130,1,'램프로딩',10,NULL),(443,130,2,'테일트림 LH 스크류 4개소 체결',12,NULL),(444,131,1,'테일트림 RH 스크류 4개소 체결',12,NULL),(445,132,1,'램프 RH 스크류 3개소 체결',9,NULL),(446,132,2,'포그램프 스크류 2개소 체결',6,NULL),(447,133,1,'카메라 로딩',5,NULL),(448,133,2,'램프 LH 스크류 3개소 체결',9,NULL),(449,133,3,'포그램프 스크류 1개소 체결',3,NULL),(450,134,1,'와이어링 로딩',10,NULL),(451,134,2,'와이어링 센터 체결',10,NULL),(452,134,3,'리테이너 2개소 체결',6,NULL),(453,135,1,'백빔 로딩',10,NULL),(454,135,2,'백빔 리테이너 3개소 체결',7,NULL),(455,135,3,'와이어링 LH 체결',12,NULL),(456,135,4,'와이어링 RH 체결',12,NULL),(457,136,1,'통전검사',25,NULL),(458,137,1,'내부 및 조립이종 검사',35,NULL),(459,138,1,'U지그 범퍼 이동 및 로딩',5,NULL),(460,138,2,'부직포 2개소 부착',8,NULL),(461,138,3,'UWB 브라켓 L/R 수동 융착',8,NULL),(462,138,4,'센서홀더 2개소 체결',7,NULL),(463,138,5,'펀칭 장비 범퍼 로딩',10,NULL),(464,139,1,'펀칭 장비 범퍼 로딩',10,NULL),(465,139,2,'펀칭&융착',30,NULL),(466,139,3,'초음파 장비 센서홀더 4개소 체결',10,NULL),(467,139,4,'초음파 장비 범퍼 로딩',10,NULL),(468,139,5,'초음파 펀칭&융착',30,NULL),(469,139,6,'번호판 장비 로딩',17,NULL),(470,139,7,'번호판 장비 펀칭',40,NULL),(471,139,8,'U지그 이동 및 로딩',10,NULL),(472,139,9,'센서 2개소 체결',60,NULL),(473,139,10,'N지그 LWR 로딩',17,NULL),(474,139,11,'LWR 센타몰딩 체결',10,NULL),(475,140,1,'N지그 범퍼 이동 및 로딩',10,NULL),(476,140,2,'너트 스프링 체결',6,NULL),(477,140,3,'번호판 램프 L/R 체결',3,NULL),(478,140,4,'사이드몰딩 L/R 체결',23,NULL),(479,140,5,'보호랩 L/R 부착',8,NULL),(480,140,6,'리플렉터 L/R 체결',8,NULL),(481,140,7,'버퍼 컨베어 로딩',10,NULL),(482,141,1,'테일트림 L/R 로딩',5,NULL),(483,141,2,'UWB LH 체결',5,NULL),(484,141,3,'로워 몰딩 스크류 2개소 체결',6,NULL),(485,141,4,'몰딩 LH 스크류 3개소',9,NULL),(486,141,5,'범퍼로워 스크류 5개소 체결',15,NULL),(487,141,6,'리플렉터 스크류 3개소 체결',9,NULL),(488,142,1,'범퍼로딩',10,NULL),(489,142,2,'UWB RH 로딩',5,NULL),(490,142,3,'UWB RH 체결',5,NULL),(491,142,4,'로워몰딩 스크류 2개소 체결',6,NULL),(492,142,5,'몰딩 LH 스크류 3개소 체결',9,NULL),(493,142,6,'로워 스크류 5개소 체결',15,NULL),(494,142,7,'리플렉터 스크류 3개소 체결',9,NULL),(495,143,1,'코너레이더 LH 스크류 3개소 체결',9,NULL),(496,143,2,'테일트림 LH 스크류 4개소 체결',12,NULL),(497,144,1,'코너레이더 L/R 로딩',5,NULL),(498,144,2,'코너레이더 RH 스크류 3개소 체결',9,NULL),(499,144,3,'테일트림 RH 스크류 4개소 체결',12,NULL),(500,145,1,'램프 L/R 로딩',5,NULL),(501,145,2,'램프 RH 스크류 4개소 체결',12,NULL),(502,145,3,'포그램프 스크류 1개소 체결',3,NULL),(503,146,1,'램프 LH 스크류 4개소 체결',12,NULL),(504,146,2,'E/ABS 로딩',10,NULL),(505,146,3,'포그램프 스크류 1개소 체결',3,NULL),(506,147,1,'와이어링 로딩',10,NULL),(507,147,2,'와이어링 센터 체결',30,NULL),(508,147,3,'백빔 리테이너 2개소 체결',5,NULL),(509,148,1,'백빔 로딩',10,NULL),(510,148,2,'와이어링 LH 체결',40,NULL),(511,148,3,'와이어링 RH 체결',40,NULL),(512,148,4,'리테이너 2개소 체결',6,NULL),(513,149,1,'통전검사',25,NULL),(514,150,1,'내부 및 조립이종 검사',35,NULL),(515,151,1,'UWB 브라켓 L/R 수동융착',8,NULL),(516,151,2,'부직포 2개소 부착',8,NULL),(517,151,3,'펀칭&융착 홀더 2개소 체결',39,NULL),(518,151,4,'초음파 펀칭&융착 홀더 4개소 체결',40,NULL),(519,151,5,'번호판 펀칭',57,NULL),(520,151,6,'LWR/CTR L/R 체결',14,NULL),(521,151,7,'사이드 몰딩 L/R 체결',23,NULL),(522,151,8,'리플렉터 L/R 체결',8,NULL),(523,151,9,'번호판 램프 L/R 체결',3,NULL),(524,151,10,'스프링너트 2개소 체결',6,NULL),(525,151,11,'센서 6개소 체결',60,NULL),(526,152,1,'테일트림 L/R 로딩',5,NULL),(527,152,2,'UWB LH 체결',5,NULL),(528,152,3,'로워 몰딩 스크류 2개소 체결',6,NULL),(529,152,4,'몰딩 LH 스크류 3개소 체결',9,NULL),(530,152,5,'범퍼로워 스크류 5개소 체결',15,NULL),(531,152,6,'리플렉터 스크류 3개소 체결',9,NULL),(532,153,1,'UWB LH 로딩',5,NULL),(533,153,2,'로워몰딩 스크류 2개소 체결',6,NULL),(534,153,3,'몰딩 LH 스크류 3개소 체결',9,NULL),(535,153,4,'로워 스크류 3개소 체결',9,NULL),(536,153,5,'리플렉터 스크류 3개소 체결',9,NULL),(537,154,1,'코너레이더 LH 스크류 3개소 체결',9,NULL),(538,154,2,'테일트림 LH 스크류 4개소 체결',12,NULL),(539,155,1,'코너레이더 L/R 로딩',5,NULL),(540,155,2,'코너레이더 RH 스크류 3개소 체결',9,NULL),(541,155,3,'테일트림 RH 스크류 4개소 체결',12,NULL),(542,156,1,'램프 L/R 로딩',5,NULL),(543,156,2,'램프 RH 스크류 4개소 체결',12,NULL),(544,156,3,'포그램프 스크류 1개소 체결',3,NULL),(545,157,1,'램프 LH 스크류 4개소 체결',12,NULL),(546,157,2,'E/ABS 로딩',10,NULL),(547,157,3,'포그램프 스크류 1개소 체결',3,NULL),(548,158,1,'와이어링 로딩',10,NULL),(549,158,2,'와이어링 센터 체결',30,NULL),(550,158,3,'백빔 리테이너 2개소 체결',5,NULL),(551,159,1,'백빔 로딩',10,NULL),(552,159,2,'와이어링 LH 체결',40,NULL),(553,159,3,'와이어링 RH 체결',40,NULL),(554,159,4,'리테이너 2개소 체결',6,NULL),(555,160,1,'통전검사',25,NULL),(556,161,1,'내부 및 조립이종 검사',35,NULL),(557,162,1,'범퍼로워 로딩',25,NULL),(558,162,2,'범퍼로워 부직포 3개소 부착',8,NULL),(559,162,3,'리플렉터 체결',8,NULL),(560,162,4,'스키드 체결',30,NULL),(561,162,5,'범퍼어퍼 로딩',60,NULL),(562,162,6,'사이드몰딩 L/R 체결',10,NULL),(563,163,1,'U지그 이동',5,NULL),(564,163,2,'리테이너 L/R 각 3개소 체결',9,NULL),(565,163,3,'스프링너트 L/R 각 2개소 체결',10,NULL),(566,163,4,'마운팅 브라켓 L/R 체결',5,NULL),(567,163,5,'리벳 L/R 각 2개소 체결',10,NULL),(568,163,6,'센터 센서 4개소 체결',20,NULL),(569,163,7,'리테이너 L/R 각 3개소 마킹',5,NULL),(570,163,8,'육각 너트 L/R 각 2개소 체결',10,NULL),(571,164,1,'범퍼로딩',10,NULL),(572,164,2,'사이드피스 LH 및 스크류 1개소 체결',10,NULL),(573,164,3,'리테이너 스크류 1개소 체결',3,NULL),(574,164,4,'스키드 체결',10,NULL),(575,164,5,'사이드 피스 LH 스크류 3개소 체결',7,NULL),(576,165,1,'사이드피스/스키드 피스/립 L/R 로딩',5,NULL),(577,165,2,'사이드 피스 RH 및 스크류 1개소 체결',10,NULL),(578,165,3,'리테이너 스크류 1개소 체결',3,NULL),(579,165,4,'립 체결',10,NULL),(580,165,5,'사이드 피스 RH 스크류 3개소 체결',7,NULL),(581,166,1,'램프 L/R 로딩',5,NULL),(582,166,2,'안테나 스크류 2개소 체결',5,NULL),(583,166,3,'센터 리플렉터 스크류 2개소 체결',5,NULL),(584,166,4,'로워 스크류 1개소 체결',3,NULL),(585,167,1,'안테나 로딩 및 스크류 1개소 체결',10,NULL),(586,167,2,'피스 및 스키드 스크류 6개소 체결',25,NULL),(587,168,1,'램프 RH 스크류 5개소 체결',10,NULL),(588,169,1,'램프 LH 스크류 5개소 체결',10,NULL),(589,170,1,'와이어링 로딩',10,NULL),(590,170,2,'와이어링 센터 체결',60,NULL),(591,171,1,'백빔 로딩',10,NULL),(592,171,2,'리테이너 6개소 체결',15,NULL),(593,171,3,'와이어링 LH 체결',50,NULL),(594,171,4,'와이어링 RH 체결',40,NULL),(595,172,1,'통전검사',25,NULL),(596,173,1,'내부 및 조립이종 검사',35,NULL),(597,174,1,'범퍼로워 체결',25,NULL),(598,174,2,'범퍼로워 부직포 3개소 부착',8,NULL),(599,174,3,'스키드 체결',30,NULL),(600,174,4,'센터 스키드 체결',35,NULL),(601,174,5,'사이드몰딩 L/R 체결',10,NULL),(602,174,6,'리플렉터 체결',8,NULL),(603,175,1,'스프링너트 L/R 각 2개소 체결',10,NULL),(604,175,2,'리테이너 L/R 각 3개소 체결',9,NULL),(605,175,3,'리테이너 L/R 각 3개소 마킹',5,NULL),(606,175,4,'리벳 L/R 각 2개소 체결',10,NULL),(607,175,5,'센서 체결',20,NULL),(608,176,1,'범퍼로딩',10,NULL),(609,176,2,'사이드피스 LH 및 스크류 1개소 체결',10,NULL),(610,176,3,'리테이너 스크류 1개소 체결',3,NULL),(611,176,4,'스키드 체결',10,NULL),(612,176,5,'사이드 피스 LH 스크류 3개소 체결',7,NULL),(613,177,1,'사이드피스/스키드 피스/립 L/R 로딩',5,NULL),(614,177,2,'사이드 피스 RH 및 스크류 1개소 체결',10,NULL),(615,177,3,'리테이너 스크류 1개소 체결',3,NULL),(616,177,4,'립 체결',10,NULL),(617,177,5,'사이드 피스 RH 스크류 3개소 체결',7,NULL),(618,178,1,'램프 L/R 로딩',5,NULL),(619,178,2,'안테나 스크류 2개소 체결',5,NULL),(620,178,3,'센터 리플렉터 스크류 2개소 체결',5,NULL),(621,178,4,'로워 스크류 1개소 체결',3,NULL),(622,179,1,'안테나 로딩 및 스크류 1개소 체결',10,NULL),(623,179,2,'피스 및 스키드 스크류 6개소 체결',25,NULL),(624,180,1,'램프 RH 스크류 5개소 체결',10,NULL),(625,181,1,'램프 LH 스크류 5개소 체결',10,NULL),(626,182,1,'와이어링 로딩',10,NULL),(627,182,2,'와이어링 센터 체결',60,NULL),(628,183,1,'백빔 로딩',10,NULL),(629,183,2,'리테이너 6개소 체결',15,NULL),(630,183,3,'와이어링 LH 체결',50,NULL),(631,183,4,'와이어링 RH 체결',40,NULL),(632,184,1,'통전검사',25,NULL),(633,185,1,'내부 및 조립이종 검사',35,NULL);
/*!40000 ALTER TABLE `work_step` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_step_machine`
--

DROP TABLE IF EXISTS `work_step_machine`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_step_machine` (
  `work_step_id` bigint unsigned NOT NULL,
  `machine_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`work_step_id`,`machine_id`),
  KEY `fk_work_step_machine_machine` (`machine_id`),
  CONSTRAINT `fk_work_step_machine_machine` FOREIGN KEY (`machine_id`) REFERENCES `machine` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_work_step_machine_step` FOREIGN KEY (`work_step_id`) REFERENCES `work_step` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_step_machine`
--

LOCK TABLES `work_step_machine` WRITE;
/*!40000 ALTER TABLE `work_step_machine` DISABLE KEYS */;
INSERT INTO `work_step_machine` VALUES (1,1),(4,1),(5,1),(47,1),(50,1),(51,1),(297,1),(298,1),(352,1),(353,1),(463,1),(464,1),(3,2),(49,2),(94,2),(137,2),(182,2),(6,3),(52,3),(140,3),(185,3),(294,3),(309,3),(349,3),(364,3),(459,3),(471,3),(563,3),(10,4),(56,4),(154,4),(199,4),(308,4),(363,4),(11,5),(12,5),(57,5),(58,5),(97,5),(101,5),(102,5),(106,5),(466,5),(467,5),(468,5),(518,5),(14,6),(60,6),(107,6),(147,6),(149,6),(192,6),(194,6),(300,6),(355,6),(398,6),(400,6),(473,6),(475,6),(18,7),(64,7),(311,7),(366,7),(44,8),(46,8),(90,8),(92,8),(133,8),(135,8),(177,8),(179,8),(223,8),(225,8),(286,8),(288,8),(344,8),(345,8),(395,8),(396,8),(430,8),(431,8),(457,8),(458,8),(513,8),(514,8),(555,8),(556,8),(595,8),(596,8),(632,8),(633,8),(93,9),(95,9),(241,10),(481,10),(136,11),(138,11),(181,11),(183,11),(73,12),(144,12),(189,12),(291,13),(346,13),(469,13),(470,13);
/*!40000 ALTER TABLE `work_step_machine` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_step_part`
--

DROP TABLE IF EXISTS `work_step_part`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_step_part` (
  `work_step_id` bigint unsigned NOT NULL,
  `part_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`work_step_id`,`part_id`),
  KEY `fk_work_step_part_part` (`part_id`),
  CONSTRAINT `fk_work_step_part_part` FOREIGN KEY (`part_id`) REFERENCES `part` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_work_step_part_step` FOREIGN KEY (`work_step_id`) REFERENCES `work_step` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_step_part`
--

LOCK TABLES `work_step_part` WRITE;
/*!40000 ALTER TABLE `work_step_part` DISABLE KEYS */;
INSERT INTO `work_step_part` VALUES (3,1),(4,1),(11,1),(22,1),(45,1),(46,1),(49,1),(50,1),(57,1),(68,1),(91,1),(92,1),(94,1),(95,1),(114,1),(134,1),(135,1),(137,1),(138,1),(149,1),(158,1),(178,1),(179,1),(182,1),(183,1),(194,1),(203,1),(224,1),(225,1),(249,1),(286,1),(287,1),(288,1),(291,1),(298,1),(318,1),(344,1),(345,1),(346,1),(353,1),(371,1),(395,1),(396,1),(412,1),(430,1),(431,1),(438,1),(457,1),(458,1),(459,1),(463,1),(464,1),(467,1),(469,1),(475,1),(488,1),(513,1),(514,1),(555,1),(556,1),(571,1),(595,1),(596,1),(608,1),(632,1),(633,1),(13,2),(15,2),(59,2),(61,2),(93,2),(147,2),(148,2),(150,2),(192,2),(193,2),(195,2),(227,2),(228,3),(229,3),(486,3),(530,3),(557,3),(597,3),(561,4),(401,5),(401,6),(301,7),(356,7),(301,8),(356,8),(5,9),(31,9),(51,9),(77,9),(136,9),(181,9),(462,9),(466,9),(2,10),(48,10),(119,10),(124,10),(278,10),(2,11),(48,11),(119,11),(124,11),(278,11),(297,12),(352,12),(164,13),(209,13),(7,14),(53,14),(7,15),(53,15),(370,16),(374,16),(375,16),(104,17),(142,17),(187,17),(104,18),(142,18),(187,18),(21,19),(24,19),(26,19),(28,19),(33,19),(35,19),(36,19),(37,19),(67,19),(70,19),(72,19),(74,19),(79,19),(81,19),(82,19),(83,19),(105,19),(111,19),(112,19),(113,19),(116,19),(120,19),(121,19),(125,19),(126,19),(127,19),(128,19),(143,19),(157,19),(159,19),(161,19),(162,19),(163,19),(165,19),(166,19),(168,19),(169,19),(188,19),(202,19),(204,19),(206,19),(207,19),(208,19),(210,19),(211,19),(213,19),(215,19),(248,19),(261,19),(262,19),(272,19),(274,19),(282,19),(8,20),(25,20),(32,20),(54,20),(71,20),(78,20),(8,21),(25,21),(32,21),(54,21),(71,21),(78,21),(251,22),(263,22),(9,23),(55,23),(141,23),(186,23),(275,23),(289,23),(310,23),(365,23),(472,23),(525,23),(607,23),(16,24),(62,24),(108,24),(153,24),(198,24),(234,24),(17,25),(63,25),(109,25),(19,26),(65,26),(110,26),(115,26),(155,27),(200,27),(155,28),(200,28),(246,29),(259,30),(245,31),(258,32),(244,33),(257,34),(20,35),(66,35),(156,35),(201,35),(312,35),(313,35),(319,35),(483,35),(489,35),(490,35),(527,35),(532,35),(23,36),(69,36),(29,37),(75,37),(267,37),(270,37),(324,37),(328,37),(377,37),(380,37),(495,37),(498,37),(537,37),(540,37),(327,38),(497,38),(539,38),(327,39),(497,39),(539,39),(117,40),(144,40),(189,40),(27,41),(73,41),(271,41),(273,41),(567,41),(606,41),(27,42),(73,42),(271,42),(273,42),(567,42),(606,42),(30,43),(76,43),(118,43),(268,43),(432,43),(447,43),(34,44),(80,44),(170,44),(216,44),(39,45),(40,45),(85,45),(86,45),(130,45),(171,45),(173,45),(217,45),(219,45),(277,45),(279,45),(280,45),(41,46),(43,46),(87,46),(89,46),(131,46),(174,46),(176,46),(220,46),(222,46),(284,46),(44,47),(90,47),(133,47),(172,47),(177,47),(218,47),(223,47),(283,47),(337,47),(338,47),(342,47),(343,47),(388,47),(389,47),(393,47),(394,47),(423,47),(424,47),(428,47),(429,47),(450,47),(451,47),(455,47),(456,47),(506,47),(507,47),(510,47),(511,47),(548,47),(549,47),(552,47),(553,47),(589,47),(590,47),(593,47),(594,47),(626,47),(627,47),(630,47),(631,47),(38,48),(84,48),(129,48),(568,48),(42,49),(88,49),(132,49),(175,49),(221,49),(285,49),(290,49),(504,49),(546,49),(97,50),(101,50),(145,51),(190,51),(123,52),(123,53),(99,54),(99,55),(100,56),(122,56),(102,57),(106,57),(103,58),(98,59),(98,60),(230,61),(232,61),(230,62),(232,62),(231,63),(307,64),(315,64),(322,64),(362,64),(399,64),(410,64),(436,64),(560,64),(574,64),(599,64),(611,64),(233,65),(233,66),(151,67),(196,67),(235,67),(304,67),(359,67),(474,67),(236,68),(600,68),(237,69),(303,69),(358,69),(521,69),(237,70),(303,70),(358,70),(521,70),(478,71),(562,71),(601,71),(478,72),(562,72),(601,72),(238,73),(579,73),(616,73),(239,74),(240,75),(479,76),(479,77),(242,78),(255,79),(243,80),(256,81),(247,82),(260,83),(250,84),(250,85),(252,86),(264,87),(253,88),(265,89),(254,90),(266,91),(160,92),(205,92),(269,92),(160,93),(205,93),(269,93),(276,94),(281,95),(152,96),(197,96),(152,97),(197,97),(167,98),(212,98),(180,99),(226,99),(214,100),(317,100),(320,100),(517,100),(518,100),(397,101),(473,101),(405,102),(524,102),(565,103),(603,103),(565,104),(603,104),(406,105),(460,105),(516,105),(558,105),(598,105),(305,106),(360,106),(404,106),(477,106),(523,106),(305,107),(360,107),(404,107),(477,107),(523,107),(293,108),(348,108),(476,108),(295,109),(350,109),(461,109),(515,109),(295,110),(350,110),(461,110),(515,110),(296,111),(351,111),(316,112),(323,112),(369,112),(373,112),(411,112),(414,112),(437,112),(440,112),(487,112),(494,112),(531,112),(536,112),(559,112),(602,112),(302,113),(357,113),(402,113),(480,113),(522,113),(302,114),(357,114),(402,114),(480,114),(522,114),(314,115),(321,115),(306,116),(361,116),(306,117),(361,117),(403,118),(425,118),(452,118),(512,118),(554,118),(573,118),(578,118),(592,118),(610,118),(615,118),(629,118),(564,119),(569,119),(604,119),(605,119),(564,120),(569,120),(604,120),(605,120),(376,121),(379,121),(417,121),(418,121),(443,121),(444,121),(496,121),(499,121),(538,121),(541,121),(367,122),(407,122),(433,122),(482,122),(526,122),(367,123),(407,123),(433,123),(482,123),(526,123),(408,124),(434,124),(409,125),(435,125),(368,126),(372,126),(413,126),(439,126),(493,126),(535,126),(584,126),(621,126),(415,127),(441,127),(332,128),(334,128),(383,128),(385,128),(416,128),(419,128),(421,128),(442,128),(445,128),(448,128),(501,128),(503,128),(543,128),(545,128),(587,128),(588,128),(624,128),(625,128),(331,129),(382,129),(500,129),(542,129),(581,129),(618,129),(331,130),(382,130),(500,130),(542,130),(581,130),(618,130),(333,131),(335,131),(336,131),(384,131),(386,131),(387,131),(420,131),(422,131),(446,131),(449,131),(502,131),(505,131),(544,131),(547,131),(340,132),(391,132),(426,132),(453,132),(509,132),(551,132),(591,132),(628,132),(339,133),(341,133),(390,133),(392,133),(427,133),(454,133),(508,133),(550,133),(572,134),(575,134),(577,134),(580,134),(609,134),(612,134),(614,134),(617,134),(576,135),(613,135),(576,136),(613,136),(582,137),(585,137),(619,137),(622,137),(583,138),(620,138),(586,139),(623,139),(566,140),(566,141),(570,142),(570,143),(484,144),(491,144),(528,144),(533,144),(485,145),(492,145),(529,145),(534,145),(520,146),(520,147),(325,148),(326,148),(329,148),(330,148),(378,148),(381,148);
/*!40000 ALTER TABLE `work_step_part` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-29  1:20:35
