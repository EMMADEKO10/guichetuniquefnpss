import { newsAndStatsService } from '../../../../cms/news-and-stats.mjs';
import { requireActor, errorResponse, readJson, HttpError } from '../../../../server/api-auth.mjs';
import { hydrateFromNeon, persistToNeon } from '../../../../infra/neon-persistence.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cms/news (REQ-13, ADM-10)
 * - Public : liste les actualités publiées (filtrables par ?category=...).
 * - ?all=true : liste toutes les actualités (brouillons inclus), réservé à l'administrateur.
 */
export async function GET(request) {
  try {
    await hydrateFromNeon();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || null;
    if (searchParams.get('all') === 'true') {
      const actor = requireActor(request);
      const articles = newsAndStatsService.listAllNews(actor);
      return Response.json({ success: true, articles });
    }
    const articles = newsAndStatsService.listPublishedNews({ category });
    return Response.json({ success: true, articles });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/cms/news — création d'une actualité par l'administrateur (ADM-10).
 */
export async function POST(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const body = await readJson(request);
    const article = newsAndStatsService.createNewsArticle(actor, {
      title: body.title,
      summary: body.summary,
      content: body.content,
      category: body.category,
      published: body.published !== false,
      publishedAt: body.publishedAt
    });
    await persistToNeon();
    return Response.json({ success: true, article }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * PUT /api/cms/news — publication ou dépublication d'une actualité (ADM-10).
 */
export async function PUT(request) {
  try {
    await hydrateFromNeon();
    const actor = requireActor(request);
    const body = await readJson(request);
    if (!body.articleId || typeof body.published !== 'boolean') {
      throw new HttpError(400, 'articleId et published (booléen) requis.');
    }
    const article = newsAndStatsService.setNewsPublishedState(actor, body.articleId, body.published);
    await persistToNeon();
    return Response.json({ success: true, article });
  } catch (err) {
    return errorResponse(err);
  }
}

