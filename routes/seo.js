const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Firestore データベースインスタンス (lazy initialization)
function getDb() {
    try {
        return admin.firestore();
    } catch (error) {
        console.error('Firebase not initialized:', error.message);
        return null;
    }
}

/**
 * Generate XML sitemap for search engines
 */
router.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || 'https://synapse-note.vercel.app';
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Static pages with their priorities and change frequencies
        const staticPages = [
            { url: '', priority: '1.0', changefreq: 'daily' }, // Homepage
            { url: '/public-quizzes', priority: '0.9', changefreq: 'daily' },
            { url: '/login', priority: '0.6', changefreq: 'monthly' },
            { url: '/register', priority: '0.6', changefreq: 'monthly' }
        ];

        let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        // Add static pages
        for (const page of staticPages) {
            xmlContent += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
        }

        // Add public quizzes dynamically
        const db = getDb();
        if (db) {
            try {
                const quizzesSnapshot = await db.collection('quizzes')
                    .where('visibility', '==', 'public')
                    .orderBy('createdAt', 'desc')
                    .limit(100) // Limit to avoid overly large sitemaps
                    .get();

                for (const doc of quizzesSnapshot.docs) {
                    const quizData = doc.data();
                    const lastmod = quizData.updatedAt || quizData.createdAt;
                    const formattedDate = lastmod && typeof lastmod.toDate === 'function' 
                        ? lastmod.toDate().toISOString().split('T')[0]
                        : currentDate;

                    xmlContent += `
  <url>
    <loc>${baseUrl}/quiz/${encodeURIComponent(doc.id)}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
                }
            } catch (error) {
                console.error('Error fetching quizzes for sitemap:', error);
                // Continue without quiz URLs if database error occurs
            }
        }

        xmlContent += `
</urlset>`;

        res.set('Content-Type', 'application/xml');
        res.send(xmlContent);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;