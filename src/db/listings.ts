import { DynamoDB } from 'aws-sdk';

class Listings {
  docClient: DynamoDB.DocumentClient;

  constructor(docClient: DynamoDB.DocumentClient) {
    this.docClient = docClient;
  }

  async createListing(
    listingId: string,
    userId: string,
    title: string,
    price: number,
    description: string,
    location: string,
    tags: string[],
    pictures: string[],
  ) {
    const params = {
      TableName: 'TEListingsTable',
      Item: {
        listingId,
        userId,
        title,
        searchTitle: title.trim().toLowerCase(),
        price,
        description,
        location,
        tags,
        pictures,
        creationTime: Date.now(),
        sold: false,
        soldTo: null,
        comments: [],
        savedCount: 0,
      },
    };
    await this.docClient.put(params).promise();
  }

  async getListings(exclusiveStartKey?: any, limit?: number) {
    const params = {
      TableName: 'TEListingsTable',
      ExclusiveStartKey: exclusiveStartKey,
      Limit: limit,
    };
    const result = await this.docClient.scan(params).promise();
    return { Items: result.Items, LastEvaluatedKey: result.LastEvaluatedKey };
  }

  async getListingsByIds(listings: string[][]) {
    const params = {
      RequestItems: {
        TEListingsTable: {
          Keys: listings.map((value) => {
            return {
              listingId: value[0],
              creationTime: value[1],
            };
          }),
        },
      },
    };
    return (await this.docClient.batchGet(params).promise()).Responses!.TEListingsTable;
  }

  async getListing(listingId: string, creationTime: string) {
    const params = {
      TableName: 'TEListingsTable',
      Key: {
        listingId,
        creationTime,
      },
    };
    return (await this.docClient.get(params).promise()).Item;
  }

  async searchListings(searchTerm: string) {
    const params = {
      TableName: 'TEListingsTable',
      FilterExpression: 'contains(searchTitle,:value)', // a string representing a constraint on the attribute
      ExpressionAttributeValues: {
        // a map of substitutions for all attribute values
        ':value': { S: searchTerm.trim().toLowerCase() },
      },
    };
    return (await this.docClient.scan(params).promise()).Items;
  }

  async markAsSold(listingId: string, creationTime: string, buyerId: string) {
    const params = {
      TableName: 'TEListingsTable',
      Key: {
        listingId,
        creationTime,
      },
      UpdateExpression: 'SET sold = :value, soldTo = :buyer',
      ExpressionAttributeValues: {
        ':value': true,
        ':buyer': buyerId,
      },
    };
    await this.docClient.update(params).promise();
  }

  async incrementSavedCount(listingId: string, creationTime: string) {
    const params = {
      TableName: 'TEListingsTable',
      Key: {
        listingId,
        creationTime,
      },
      UpdateExpression: 'ADD savedCount 1',
    };
    await this.docClient.update(params).promise();
  }

  async decrementSavedCount(listingId: string, creationTime: string) {
    const params = {
      TableName: 'TEListingsTable',
      Key: {
        listingId,
        creationTime,
      },
      UpdateExpression: 'ADD savedCount -1',
    };
    await this.docClient.update(params).promise();
  }

  async addTag(listingId: string, creationTime: string, tag: string) {
    const params = {
      TableName: 'TEListingsTable',
      Key: {
        listingId,
        creationTime,
      },
      UpdateExpression: 'SET tags = list_append(tags, :value)',
      ExpressionAttributeValues: {
        ':value': [tag],
      },
    };
    await this.docClient.update(params).promise();
  }

  async deleteTag(listingId: string, creationTime: string, tag: string) {
    const { tags } = (await this.getListing(listingId, creationTime))!;
    for (let i = 0; i < tags.length; i += 1) {
      if (tags[i] === tag) {
        const params = {
          TableName: 'TEListingsTable',
          Key: {
            listingId,
            creationTime,
          },
          UpdateExpression: `REMOVE tags[${i}]`,
        };
        // eslint-disable-next-line no-await-in-loop
        await this.docClient.update(params).promise();
        return;
      }
    }
  }

  async addPicture(listingId: string, creationTime: string, picture: string) {
    const params = {
      TableName: 'TEListingsTable',
      Key: {
        listingId,
        creationTime,
      },
      UpdateExpression: 'SET pictures = list_append(pictures, :value)',
      ExpressionAttributeValues: {
        ':value': [picture],
      },
    };
    await this.docClient.update(params).promise();
  }

  async deletePicture(listingId: string, creationTime: string, picture: string) {
    const { pictures } = (await this.getListing(listingId, creationTime))!;
    for (let i = 0; i < pictures.length; i += 1) {
      if (pictures[i] === picture) {
        const params = {
          TableName: 'TEListingsTable',
          Key: {
            listingId,
            creationTime,
          },
          UpdateExpression: `REMOVE pictures[${i}]`,
        };
        // eslint-disable-next-line no-await-in-loop
        await this.docClient.update(params).promise();
        return;
      }
    }
  }
}

export default Listings;
