package models

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"linux-iso-manager/internal/constants"
)

type ISOStatus string

const (
	StatusPending     ISOStatus = "pending"
	StatusDownloading ISOStatus = "downloading"
	StatusVerifying   ISOStatus = "verifying"
	StatusComplete    ISOStatus = "complete"
	StatusFailed      ISOStatus = "failed"
)

type ISO struct {
	CreatedAt     time.Time  `json:"created_at"`
	CompletedAt   *time.Time `json:"completed_at"`
	DownloadLink  string     `json:"download_link"`
	ChecksumType  string     `json:"checksum_type"`
	Category      string     `json:"category"` // Nouveau champ catégorie
	Edition       string     `json:"edition"`
	FileType      string     `json:"file_type"`
	Filename      string     `json:"filename"`
	FilePath      string     `json:"file_path"`
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Checksum      string     `json:"checksum"`
	Arch          string     `json:"arch"`
	DownloadURL   string     `json:"download_url"`
	ChecksumURL   string     `json:"checksum_url"`
	Status        ISOStatus  `json:"status"`
	Version       string     `json:"version"`
	ErrorMessage  string     `json:"error_message"`
	Progress      int        `json:"progress"`
	SizeBytes     int64      `json:"size_bytes"`
	DownloadCount int64      `json:"download_count"`
}

type CreateISORequest struct {
	Name         string `json:"name" binding:"required"`
	Version      string `json:"version" binding:"required"`
	Arch         string `json:"arch" binding:"required"`
	Edition      string `json:"edition"`
	Category     string `json:"category"` // Ajout pour l'API
	DownloadURL  string `json:"download_url" binding:"required,url"`
	ChecksumURL  string `json:"checksum_url" binding:"omitempty,url"`
	ChecksumType string `json:"checksum_type" binding:"omitempty,oneof=sha256 sha512 md5"`
}

type UpdateISORequest struct {
	Name         *string `json:"name"`
	Version      *string `json:"version"`
	Arch         *string `json:"arch"`
	Edition      *string `json:"edition"`
	Category     *string `json:"category"` // Ajout pour l'API
	DownloadURL  *string `json:"download_url" binding:"omitempty,url"`
	ChecksumURL  *string `json:"checksum_url" binding:"omitempty,url"`
	ChecksumType *string `json:"checksum_type" binding:"omitempty,oneof=sha256 sha512 md5"`
}

func NormalizeName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	name = strings.ReplaceAll(name, " ", "-")
	reg := regexp.MustCompile(`[^a-z0-9-]`)
	name = reg.ReplaceAllString(name, "")
	reg = regexp.MustCompile(`-+`)
	name = reg.ReplaceAllString(name, "-")
	return strings.Trim(name, "-")
}

func DetectFileType(url string) (string, error) {
	ext := filepath.Ext(url)
	ext = strings.ToLower(strings.TrimPrefix(ext, "."))
	if !constants.IsSupportedFileType(ext) {
		return "", fmt.Errorf("unsupported file type: %s", ext)
	}
	return ext, nil
}

func GenerateFilename(name, version, edition, arch, fileType string) string {
	parts := []string{name, version}
	if edition != "" {
		parts = append(parts, edition)
	}
	parts = append(parts, arch)
	return fmt.Sprintf("%s.%s", strings.Join(parts, "-"), fileType)
}

func GenerateFilePath(name, version, arch, filename string) string {
	return filepath.Join(name, version, arch, filename)
}

func GenerateDownloadLink(filePath string) string {
	return "/images/" + filepath.ToSlash(filePath)
}

func ExtractFilenameFromURL(url string) string {
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return ""
}

func (iso *ISO) GetOriginalFilename() string {
	return ExtractFilenameFromURL(iso.DownloadURL)
}

func (iso *ISO) ComputeFields() {
	iso.Name = NormalizeName(iso.Name)
	iso.Filename = GenerateFilename(iso.Name, iso.Version, iso.Edition, iso.Arch, iso.FileType)
	iso.FilePath = GenerateFilePath(iso.Name, iso.Version, iso.Arch, iso.Filename)
	iso.DownloadLink = GenerateDownloadLink(iso.FilePath)
}