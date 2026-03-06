package api

import (
    "os"
    "syscall"
    "linux-iso-manager/internal/config"
    "linux-iso-manager/internal/db"
    "linux-iso-manager/internal/pathutil" // Pour trouver le dossier temporaire
    "linux-iso-manager/internal/service"
    "linux-iso-manager/internal/ws"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

// SetupRoutes configures all routes and middleware.
func SetupRoutes(isoService *service.ISOService, statsService *service.StatsService, database *db.DB, isoDir string, wsHub *ws.Hub, cfg *config.Config) *gin.Engine {
    router := gin.Default()

    // Configure CORS
    corsConfig := cors.DefaultConfig()
    corsConfig.AllowOrigins = cfg.Server.CORSOrigins
    corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
    router.Use(cors.New(corsConfig))

    // Create handlers
    handlers := NewHandlers(isoService, isoDir)
    statsHandlers := NewStatsHandlers(statsService)

    // --- 1. ROUTE SYSTÈME PRIORITAIRE ---
    // Placée ici pour éviter d'être interceptée par le NoRoute ou le groupe API
    router.GET("/api/system/storage", func(c *gin.Context) {
        var stat syscall.Statfs_t
        if err := syscall.Statfs(isoDir, &stat); err != nil {
            c.JSON(500, gin.H{"error": "Impossible de lire le disque dur"})
            return
        }
        
        total := stat.Blocks * uint64(stat.Bsize)
        free := stat.Bavail * uint64(stat.Bsize)
        used := total - free

        c.JSON(200, gin.H{
            "total_bytes":  total,
            "used_bytes":   used,
            "free_bytes":   free,
            "free_percent": float64(free) / float64(total) * 100,
        })
    })

    // --- 2. GROUPEMENT API ---
    api := router.Group("/api")
    {
        // ISO management
        api.GET("/isos", handlers.ListISOs)
        api.POST("/isos/upload", handlers.UploadISO)
        api.GET("/isos/:id", handlers.GetISO)
        api.POST("/isos", handlers.CreateISO)
        api.PUT("/isos/:id", handlers.UpdateISO)
        api.DELETE("/isos/:id", handlers.DeleteISO)
        api.POST("/isos/:id/retry", handlers.RetryISO)

        // Statistics
        api.GET("/stats", statsHandlers.GetStats)
        api.GET("/stats/trends", statsHandlers.GetDownloadTrends)
    }

    // WebSocket endpoint
    router.GET("/ws", func(c *gin.Context) {
        ws.ServeWS(wsHub, c)
    })

    // Health check
    router.GET("/health", handlers.HealthCheck)

    // Images / Downloads
    dirConfig := &DirectoryHandlerConfig{
        ISODir:       isoDir,
        StatsService: statsService,
        DB:           database,
    }
    router.GET("/images/*filepath", DirectoryHandler(dirConfig))

    // Frontend Static Files
    frontendPath := "./ui/dist"
    router.Static("/static", frontendPath+"/static")
    router.StaticFile("/favicon.svg", frontendPath+"/favicon.svg")

    // SPA Routing - TOUJOURS EN DERNIER
    router.NoRoute(func(c *gin.Context) {
        path := c.Request.URL.Path
        // Si c'est une requête API qui n'a pas été capturée au-dessus
        if len(path) >= 4 && path[:4] == "/api" {
            c.JSON(404, gin.H{
                "success": false,
                "code":    "NOT_FOUND",
                "message": "API endpoint not found",
            })
            return
        }
        // Sinon, on sert l'index.html pour le React Router
        c.File(frontendPath + "/index.html")
    })

    // --- NOUVELLE ROUTE : NETTOYAGE DES FICHIERS TEMP ---
    router.POST("/api/system/clean-tmp", func(c *gin.Context) {
        // On récupère le chemin exact de ton dossier data/tmp
        tmpDir := pathutil.GetTempDir(isoDir)
        
        // On supprime violemment tout le dossier et son contenu, puis on le recrée vide
        os.RemoveAll(tmpDir)
        os.MkdirAll(tmpDir, 0755)

        c.JSON(200, gin.H{"success": true, "message": "Dossier temporaire nettoyé !"})
    })
    // ----------------------------------------------------
    return router
}