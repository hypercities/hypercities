-- phpMyAdmin SQL Dump
-- version 2.11.9.6
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Apr 20, 2010 at 01:19 PM
-- Server version: 5.1.42
-- PHP Version: 5.3.1

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `hypercities_new`
--

-- --------------------------------------------------------

--
-- Table structure for table `access_rights`
--

CREATE TABLE IF NOT EXISTS `access_rights` (
  `id` int(11) NOT NULL,
  `access_right` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `access_rights`
--

INSERT INTO `access_rights` (`id`, `access_right`) VALUES
(0, 'none'),
(1, 'view '),
(2, 'edit'),
(3, 'view / edit'),
(5, 'view / delete'),
(7, 'view / edit / delete');

-- --------------------------------------------------------

--
-- Table structure for table `cities`
--

CREATE TABLE IF NOT EXISTS `cities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `abbreviation` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL,
  `lat` decimal(11,8) NOT NULL,
  `lon` decimal(11,8) NOT NULL,
  `zoom` tinyint(4) NOT NULL DEFAULT '14' COMMENT 'default zoom level',
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;


--
-- Table structure for table `contents`
--

CREATE TABLE IF NOT EXISTS `contents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;





-- --------------------------------------------------------

--
-- Table structure for table `maps`
--

CREATE TABLE IF NOT EXISTS `maps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `city_id` int(11) NOT NULL,
  `date_from` datetime NOT NULL,
  `dateFrom_isBC` tinyint(1) NOT NULL DEFAULT '0',
  `date_to` datetime NOT NULL,
  `dateTo_isBC` tinyint(1) NOT NULL DEFAULT '0',
  `title` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `creator` varchar(255) DEFAULT NULL,
  `publication_date` datetime DEFAULT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `copyright_notice` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ne_lat` decimal(11,8) NOT NULL,
  `ne_lon` decimal(11,8) NOT NULL,
  `sw_lat` decimal(11,8) NOT NULL,
  `sw_lon` decimal(11,8) NOT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `scale` varchar(255) DEFAULT NULL,
  `caption` varchar(255) DEFAULT NULL,
  `caption_en` varchar(255) DEFAULT NULL,
  `collection_source` varchar(255) DEFAULT NULL,
  `image_record` varchar(255) DEFAULT NULL,
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `call_number` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_city_id` (`city_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;


-- --------------------------------------------------------

--
-- Table structure for table `maps_tags`
--

CREATE TABLE IF NOT EXISTS `maps_tags` (
  `map_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`map_id`,`tag_id`),
  KEY `FK_map_id` (`map_id`),
  KEY `FK_tag_id` (`tag_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;


-- --------------------------------------------------------

--
-- Table structure for table `maps_users`
--

CREATE TABLE IF NOT EXISTS `maps_users` (
  `map_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `access_right_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`map_id`,`user_id`),
  KEY `FK_user_id` (`user_id`),
  KEY `FK_access_right_id` (`access_right_id`),
  KEY `FK_map_id` (`map_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

--
-- Dumping data for table `maps_users`
--


-- --------------------------------------------------------

--
-- Table structure for table `map_legends`
--

CREATE TABLE IF NOT EXISTS `map_legends` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `map_id` int(11) NOT NULL,
  `source_url` varchar(255) NOT NULL,
  `width` int(11) NOT NULL,
  `height` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_map_id` (`map_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;



-- --------------------------------------------------------

--
-- Table structure for table `map_profiles`
--

CREATE TABLE IF NOT EXISTS `map_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `map_id` int(11) NOT NULL,
  `map_state_id` int(11) NOT NULL,
  `tile_type_id` int(11) NOT NULL,
  `tile_url` varchar(255) NOT NULL,
  `max_zoom_level` int(11) NOT NULL,
  `min_zoom_level` int(11) NOT NULL,
  `projection` varchar(15) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_tile_type_id` (`tile_type_id`),
  KEY `FK_map_id` (`map_id`),
  KEY `FK_map_state_id` (`map_state_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

--
-- Table structure for table `map_states`
--

CREATE TABLE IF NOT EXISTS `map_states` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `state` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=5;

--
-- Dumping data for table `map_states`
--

INSERT INTO `map_states` (`id`, `state`) VALUES
(1, 'public'),
(2, 'private'),
(3, 'pending'),
(4, 'testing');

-- --------------------------------------------------------

--
-- Table structure for table `marker_styles`
--

CREATE TABLE IF NOT EXISTS `marker_styles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=4;

--
-- Dumping data for table `marker_styles`
--

INSERT INTO `marker_styles` (`id`, `name`) VALUES
(1, 'point'),
(2, 'line'),
(3, 'polygon');

-- --------------------------------------------------------

--
-- Table structure for table `objects`
--

CREATE TABLE IF NOT EXISTS `objects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `object_type_id` int(11) NOT NULL,
  `object_state_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `content_id` int(11) DEFAULT NULL,
  `creator` varchar(255) DEFAULT NULL,
  `copyright` varchar(255) DEFAULT NULL,
  `owner_id` int(11) NOT NULL,
  `password` varchar(255) DEFAULT NULL COMMENT 'password for private object',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_owner_id` (`owner_id`),
  KEY `FK_object_type_id` (`object_type_id`),
  KEY `FK_description_id` (`content_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=2;

--
-- Dumping data for table `objects`
--

INSERT INTO `objects` (`id`, `title`, `object_type_id`, `object_state_id`, `description`, `content_id`, `creator`, `copyright`, `owner_id`, `password`, `created_at`, `updated_at`) VALUES
-- hcaanddmin's My Collections
(1, 'My Collections', 2, 1, 'These are my collections', NULL, 'HyperCities Admin', '', 1, NULL, '2010-02-18 02:23:34', '2010-02-18 02:23:34');

-- --------------------------------------------------------

--
-- Table structure for table `objects_tags`
--

CREATE TABLE IF NOT EXISTS `objects_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `object_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;



-- --------------------------------------------------------

--
-- Table structure for table `objects_users`
--

CREATE TABLE IF NOT EXISTS `objects_users` (
  `object_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `access_right_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`object_id`,`user_id`),
  KEY `FK_user_id` (`user_id`),
  KEY `FK_access_right_id` (`access_right_id`),
  KEY `FK_object_id` (`object_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;



-- --------------------------------------------------------

--
-- Table structure for table `object_mappings`
--

CREATE TABLE IF NOT EXISTS `object_mappings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `object_id` int(11) NOT NULL,
  `object_state_id` int(11) NOT NULL,
  `marker_style_id` int(11) NOT NULL,
  `kml` text NOT NULL,
  `ne_lat` decimal(11,8) DEFAULT '90.00000000',
  `ne_lon` decimal(11,8) DEFAULT '180.00000000',
  `sw_lat` decimal(11,8) DEFAULT '-90.00000000',
  `sw_lon` decimal(11,8) DEFAULT '-180.00000000',
  `view` text,
  `date_from` datetime NOT NULL DEFAULT '0001-01-01 00:00:00',
  `dateFrom_isBC` tinyint(1) NOT NULL DEFAULT '0',
  `date_to` datetime NOT NULL DEFAULT '9999-12-31 23:59:59',
  `dateTo_isBC` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_object_id` (`object_id`),
  KEY `FK_marker_style_id` (`marker_style_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=2;

--
-- Dumping data for table `object_mappings`
--
-- Create object_mapping

INSERT INTO `object_mappings` (`id`, `object_id`, `object_state_id`, `marker_style_id`, `kml`, `ne_lat`, `ne_lon`, `sw_lat`, `sw_lon`, `view`, `date_from`, `dateFrom_isBC`, `date_to`, `dateTo_isBC`, `created_at`, `updated_at`) VALUES
(1, 1, 0, 0, '', 90.00000000, 180.00000000, -90.00000000, -180.00000000, NULL, '0001-01-01 00:00:00', 0, '9999-12-31 23:59:59', 0, '2010-01-21 12:45:41', '2010-01-21 12:45:41');

-- --------------------------------------------------------



--
-- Table structure for table `object_relations`
--

CREATE TABLE IF NOT EXISTS `object_relations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `object_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `scope_id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `order` int(11) DEFAULT NULL,
  `content_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_object_id` (`object_id`),
  KEY `FK_subject_id` (`subject_id`),
  KEY `FK_owner_id` (`owner_id`),
  KEY `FK_description_id` (`content_id`),
  KEY `FK_scope_id` (`scope_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;


-- --------------------------------------------------------

--
-- Table structure for table `object_states`
--

CREATE TABLE IF NOT EXISTS `object_states` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `state` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=6 ;

--
-- Dumping data for table `object_states`
--

INSERT INTO `object_states` (`id`, `state`) VALUES
(1, 'public'),
(2, 'private visible'),
(3, 'private hidden'),
(4, 'inappropriate'),
(5, 'deleted');

-- --------------------------------------------------------

--
-- Table structure for table `object_types`
--

CREATE TABLE IF NOT EXISTS `object_types` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `object_types`
--

INSERT INTO `object_types` (`id`, `name`) VALUES
(1, 'list'),
(2, 'collection'),
(3, 'media'),
(4, 'KML'),
(5, '3D');

-- --------------------------------------------------------


-- --------------------------------------------------------

--
-- Table structure for table `search_atoms`
--

CREATE TABLE IF NOT EXISTS `search_atoms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `added_at` datetime NOT NULL,
  `last_searched_for` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;



-- --------------------------------------------------------

--
-- Table structure for table `search_hits`
--

CREATE TABLE IF NOT EXISTS `search_hits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `atom_id` int(11) NOT NULL,
  `object_id` int(11) NOT NULL,
  `weight` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;


-- --------------------------------------------------------


-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE IF NOT EXISTS `tags` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `TAG` (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `tags`
--


-- --------------------------------------------------------

--
-- Table structure for table `tile_types`
--

CREATE TABLE IF NOT EXISTS `tile_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tile_method` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=3 ;

--
-- Dumping data for table `tile_types`
--

INSERT INTO `tile_types` (`id`, `tile_method`) VALUES
(1, 'GraphicsMagick'),
(2, 'MapCruncher');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `nickname` varchar(255) NOT NULL,
  `privacy_level_id` int(11) NOT NULL,
  `city_id` int(11) DEFAULT NULL,
  `user_state_id` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `gender` enum('M','F') NOT NULL,
  `birth_year` int(4) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `occupation` varchar(255) DEFAULT NULL,
  `locality` varchar(255) DEFAULT NULL,
  `zipcode` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `collection_id` int(11) DEFAULT NULL COMMENT 'default collection',
  `lastlogin_from` varchar(255) NOT NULL,
  `lastlogin_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNI_email` (`email`),
  KEY `FK_city_id` (`city_id`),
  KEY `FK_user_state_id` (`user_state_id`),
  KEY `FK_privacy_level_id` (`privacy_level_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=2 ;

--
-- Create hcadmin user
--

INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `nickname`, `privacy_level_id`, `city_id`, `user_state_id`, `description`, `gender`, `birth_year`, `photo_url`, `occupation`, `locality`, `zipcode`, `country`, `collection_id`, `lastlogin_from`, `lastlogin_at`, `created_at`, `updated_at`) VALUES
(1, 'hcadmin', md5('password'), 'HyperCities', 'Administrator', 'hcadmin', 3, 0, 11, NULL, 'M', 1900, NULL, NULL, NULL, NULL, NULL, NULL, '192.168.1.1', NOW(), NOW(), NOW());

-- --------------------------------------------------------

--
-- Table structure for table `user_openids`
--

CREATE TABLE IF NOT EXISTS `user_openids` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid_url` varchar(255) NOT NULL,
  `provider_name` varchar(25) NOT NULL,
  `oid_type` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0: direct; 1:user_name',
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;


-- --------------------------------------------------------

--
-- Table structure for table `user_states`
--

CREATE TABLE IF NOT EXISTS `user_states` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `state` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=12 ;

--
-- Dumping data for table `user_states`
--

INSERT INTO `user_states` (`id`, `state`) VALUES
(1, 'pending'),
(2, 'disabled'),
(10, 'activated'),
(11, 'administrator');

-- --------------------------------------------------------



DELIMITER $$
--
-- Functions
--
CREATE DEFINER=`root`@`localhost` FUNCTION `dateLarger`(
                dateOneIsBC     tinyint(1),
                dateOne         datetime,
                dateTwoIsBC     tinyint(1),
                dateTwo         datetime) RETURNS tinyint(1)
    DETERMINISTIC
BEGIN
        DECLARE isLarger        tinyint(1);
        DECLARE secondsOne      int;
        DECLARE secondsTwo      int;

        IF ((dateOneIsBC = 1) AND (dateTwoIsBC = 0)) THEN
                SET isLarger = 0;
        ELSEIF ((dateOneIsBC = 0) AND (dateTwoIsBC = 1)) THEN
                SET isLarger = 1;
        ELSEIF ((dateOneIsBC = 1) AND (dateTwoIsBC = 1)) THEN
                IF (YEAR(dateOne) < YEAR(dateTwo)) THEN
                        SET isLarger = 1;
                ELSEIF (YEAR(dateOne) > YEAR(dateTwo)) THEN
                        SET isLarger = 0;
                ELSEIF (DAYOFYEAR(dateOne) < DAYOFYEAR(dateTwo)) THEN
                        SET isLarger = 0;
                ELSEIF (DAYOFYEAR(dateOne) > DAYOFYEAR(dateTwo)) THEN
                        SET isLarger = 1;
                ELSE
                        SET secondsOne = HOUR(dateOne) * 3600 + MINUTE(dateOne) * 60 + SECOND(dateOne);
                        SET secondsTwo = HOUR(dateTwo) * 3600 + MINUTE(dateTwo) * 60 + SECOND(dateTwo);
                        IF (secondsOne <= secondsTwo) THEN
                                SET isLarger = 0;
                        ELSE
                                SET isLarger = 1;
                        END IF;
                END IF;
        ELSE
                IF (YEAR(dateOne) < YEAR(dateTwo)) THEN
                        SET isLarger = 0;
                ELSEIF (YEAR(dateOne) > YEAR(dateTwo)) THEN
                        SET isLarger = 1;
                ELSEIF (DAYOFYEAR(dateOne) < DAYOFYEAR(dateTwo)) THEN
                        SET isLarger = 0;
                ELSEIF (DAYOFYEAR(dateOne) > DAYOFYEAR(dateTwo)) THEN
                        SET isLarger = 1;
                ELSE
                        SET secondsOne = HOUR(dateOne) * 3600 + MINUTE(dateOne) * 60 + SECOND(dateOne);
                        SET secondsTwo = HOUR(dateTwo) * 3600 + MINUTE(dateTwo) * 60 + SECOND(dateTwo);
                        IF (secondsOne <= secondsTwo) THEN
                                SET isLarger = 0;
                        ELSE
                                SET isLarger = 1;
                        END IF;
                END IF;
        END IF;

        RETURN(isLarger);
END$$

DELIMITER ;
