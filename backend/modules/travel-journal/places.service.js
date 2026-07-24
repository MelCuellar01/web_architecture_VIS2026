import { PrismaClient } from '@prisma/client';
import { broadcastSseEvent } from '../../utils/sse.js';

const prisma = new PrismaClient();

const placeInclude = {
  entries: {
    include: {
      images: true,
    },
  },
};

const isMissing = (value) => value === undefined || value === null || String(value).trim() === '';

export async function createPlace(data, userId) {
  const { city, country } = data ?? {};

  if (isMissing(city) || isMissing(country)) {
    const error = new Error('City and country are required');
    error.statusCode = 400;
    throw error;
  }

  const newPlace = await prisma.place.create({
    data: {
      city,
      country,
      userId,
    },
    include: placeInclude,
  });

  broadcastSseEvent('place-created', { changed: true });

  return newPlace;
}

export default createPlace;