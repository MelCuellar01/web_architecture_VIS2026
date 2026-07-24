import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const entryInclude = {
  place: true,
  images: true,
};

const isMissing = (value) => value === undefined || value === null || String(value).trim() === '';

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export async function createEntry(data, files, userId, routePlaceId) {
  const placeId = routePlaceId || data?.placeId;
  const { title, description, rating, category, visitDate } = data ?? {};

  if (isMissing(placeId)) {
    throw createServiceError(400, 'placeId is required');
  }

  if (isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
    throw createServiceError(400, 'title, description, rating and category are required');
  }

  const place = await prisma.place.findFirst({
    where: { id: placeId, userId },
  });

  if (!place) {
    throw createServiceError(404, `Place not found with ID: ${placeId}`);
  }

  const imageUrls = [
    ...parseList(data?.imageUrls),
    ...parseList(data?.existingImages),
    ...(files || []).map((file) => `/uploads/${file.filename}`),
  ];

  const uniqueImageUrls = [...new Set(imageUrls)];
  const numericRating = Number(rating);

  if (Number.isNaN(numericRating)) {
    throw createServiceError(400, 'title, description, rating and category are required');
  }

  const createdEntry = await prisma.entry.create({
    data: {
      placeId,
      userId,
      title,
      description,
      rating: numericRating,
      category,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      ...(uniqueImageUrls.length > 0
        ? {
            images: {
              create: uniqueImageUrls.map((imageUrl) => ({ imageUrl })),
            },
          }
        : {}),
    },
    include: entryInclude,
  });

  return createdEntry;
}

export default createEntry;