import * as express from 'express';
import { AWSError } from 'aws-sdk';
import { UsersTable, ListingsTable, TagsTable } from '../db';
import HttpError from '../error/http';
import config from '../config';

const router = express.Router();

router.get('/profile', async (req, res, next) => {
  try {
    let { userId } = res.locals;
    if (req.query.targetUserId) {
      userId = req.query.targetUserId as string;
    }
    const result = await UsersTable.getProfile(userId);
    if (result) {
      return res.send(result);
    }
    return next(new HttpError.NotFound('User Not Found.'));
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.post('/rate-user', async (req, res, next) => {
  try {
    if (!req.body) {
      return next(new HttpError.BadRequest('Missing body'));
    }
    const { rating, toRateUserId } = req.body;
    if (!rating) {
      return next(new HttpError.BadRequest('Missing rating'));
    }
    if (!toRateUserId) {
      return next(new HttpError.BadRequest('Missing toRateUserId'));
    }
    await UsersTable.addRating(toRateUserId, rating);
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.get('/search', async (req, res, next) => {
  try {
    if (req.query.name) {
      return res.send(await UsersTable.searchProfiles(req.query.name as string));
    }
    if (req.query.email) {
      return res.send(await UsersTable.searchProfilesByEmail(req.query.email as string));
    }
    return next(new HttpError.BadRequest('Missing query params.'));
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.put('/update', async (req, res, next) => {
  if (!req.body) {
    return next(new HttpError.BadRequest('Missing body'));
  }
  try {
    if (req.body.phone) {
      await UsersTable.updatePhone(res.locals.userId, req.body.phone);
    }
    if (req.body.picture) {
      await UsersTable.updatePicture(res.locals.userId, req.body.picture);
    }
    if (req.body.name) {
      await UsersTable.updateName(res.locals.userId, req.body.name);
    }
    if (req.body.email) {
      await UsersTable.updateEmail(res.locals.userId, req.body.email);
    }
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.post('/signup', async (req, res, next) => {
  if (!req.body) {
    return next(new HttpError.BadRequest('Missing body'));
  }
  const { phone, customName, customEmail, customPicture } = req.body;
  const { name, email, picture } = res.locals;
  if (!name && !customName) {
    return next(new HttpError.BadRequest('Missing name'));
  }
  if (!email && !customEmail) {
    return next(new HttpError.BadRequest('Missing email'));
  }
  if (!picture && !customPicture) {
    return next(new HttpError.BadRequest('Missing picture'));
  }
  try {
    await UsersTable.createProfile(
      res.locals.userId,
      customName || name,
      customEmail || email,
      customPicture || picture,
      phone,
    );
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.post('/save-listing', async (req, res, next) => {
  if (!req.body) {
    return next(new HttpError.BadRequest('Missing body'));
  }
  const { listingId, creationTime } = req.body;
  if (!listingId) {
    return next(new HttpError.BadRequest('Missing listingId'));
  }
  if (!creationTime) {
    return next(new HttpError.BadRequest('Missing creationTime'));
  }
  try {
    await UsersTable.addSavedListing(res.locals.userId, listingId, creationTime);
    await ListingsTable.incrementSavedCount(listingId, creationTime);
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.delete('/unsave-listing', async (req, res, next) => {
  if (!req.body) {
    return next(new HttpError.BadRequest('Missing body'));
  }
  const { listingId, creationTime } = req.body;
  if (!listingId) {
    return next(new HttpError.BadRequest('Missing listingId'));
  }
  if (!creationTime) {
    return next(new HttpError.BadRequest('Missing creationTime'));
  }
  try {
    await UsersTable.removeSavedListing(res.locals.userId, listingId, creationTime);
    await ListingsTable.decrementSavedCount(listingId, creationTime);
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.post('/add-listing-to-rate', async (req, res, next) => {
  if (!req.body) {
    return next(new HttpError.BadRequest('Missing body'));
  }
  const { buyerId, listingId, creationTime } = req.body;
  if (!buyerId) {
    return next(new HttpError.BadRequest('Missing buyerId'));
  }
  if (!listingId) {
    return next(new HttpError.BadRequest('Missing listingId'));
  }
  if (!creationTime) {
    return next(new HttpError.BadRequest('Missing creationTime'));
  }
  try {
    await UsersTable.addListingToRate(buyerId, listingId, creationTime, res.locals.userId);
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.delete('/remove-listing-to-rate', async (req, res, next) => {
  if (!req.body) {
    return next(new HttpError.BadRequest('Missing body'));
  }
  const { listingId, creationTime } = req.body;
  if (!listingId) {
    return next(new HttpError.BadRequest('Missing listingId'));
  }
  if (!creationTime) {
    return next(new HttpError.BadRequest('Missing creationTime'));
  }
  try {
    await UsersTable.removeListingToRate(res.locals.userId, listingId, creationTime);
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.post('/make-listing', async (req, res, next) => {
  if (!req.body) {
    return next(new HttpError.BadRequest('Missing body'));
  }
  const { listingId, creationTime, title, price, description, location, tags, pictures } = req.body;
  if (!listingId) {
    return next(new HttpError.BadRequest('Missing listingId'));
  }
  if (!creationTime) {
    return next(new HttpError.BadRequest('Missing creationTime'));
  }
  if (!title) {
    return next(new HttpError.BadRequest('Missing title'));
  }
  if (!price) {
    return next(new HttpError.BadRequest('Missing price'));
  }
  if (!description) {
    return next(new HttpError.BadRequest('Missing description'));
  }
  if (!location) {
    return next(new HttpError.BadRequest('Missing location'));
  }
  if (!tags) {
    return next(new HttpError.BadRequest('Missing tags'));
  }
  if (!pictures) {
    return next(new HttpError.BadRequest('Missing picture'));
  }
  try {
    await ListingsTable.createListing(
      listingId,
      creationTime,
      res.locals.userId,
      title,
      price,
      description,
      location,
      tags,
      pictures,
    );
    await UsersTable.addActiveListing(res.locals.userId, listingId, creationTime);
    for (let i = 0; i < tags.length; i += 1) {
      if (!(await TagsTable.getTag(tags[i]))) {
        await TagsTable.addTag(tags[i]);
      }
      await TagsTable.addListing(tags[i], listingId, creationTime);
    }
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

router.delete('/delete-listing', async (req, res, next) => {
  if (!req.body) {
    return next(new HttpError.BadRequest('Missing body'));
  }
  const { listingId, creationTime, tags } = req.body;
  if (!listingId) {
    return next(new HttpError.BadRequest('Missing listingId'));
  }
  if (!creationTime) {
    return next(new HttpError.BadRequest('Missing creationTime'));
  }
  if (!tags) {
    return next(new HttpError.BadRequest('Missing tags'));
  }
  try {
    await ListingsTable.deleteListing(listingId, creationTime);
    await UsersTable.removeActiveListing(res.locals.userId, listingId, creationTime);
    for (let i = 0; i < tags.length; i += 1) {
      await TagsTable.removeListing(tags[i], listingId, creationTime);
      if ((await TagsTable.getTag(tags[i]))!.listings.length === 0) {
        await TagsTable.removeTag(tags[i]);
      }
    }
    return res.send({ message: 'Success' });
  } catch (err) {
    const castedError = err as AWSError;
    return next(
      new HttpError.Custom(
        castedError.statusCode || config.constants.INTERNAL_SERVER_ERROR,
        castedError.message,
        castedError.code,
      ),
    );
  }
});

export default router;
