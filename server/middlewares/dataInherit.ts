export default async (ctx, next) => {
  await next();

  if (!ctx.body.data) {
    return;
  }

  const collectionName: string = ctx?.request?.url?.split("/")[2];

  const collectionUID = getCollectionUID(collectionName);

  if (!collectionUID) {
    return;
  }

  const relations: string[] = getRelations(collectionUID);

  if (!relations || relations.length < 1) {
    return;
  }

  const nullsArray: string[] = getNulls(ctx.body.data);

  if (nullsArray.length < 1) {
    return;
  }

  let checked: number[] = [ctx.body.data.id];
  ctx.body.data = await combineWithRelation(
    ctx.body.data,
    ctx.body.data,
    nullsArray,
    relations,
    checked,
    collectionUID
  );
};

function getCollectionUID(collectionName: string): string | undefined {
  for (const key in strapi.contentTypes) {
    if (strapi.contentTypes[key].collectionName === collectionName) {
      return strapi.contentTypes[key].uid;
    }
  }
}

function getRelations(collectionUID: string): string[] {
  let relations: string[] = [];
  const schema = strapi.contentTypes[collectionUID].__schema__;

  for (const item in schema.attributes) {
    if (
      schema.attributes[item].type === "relation" &&
      schema.attributes[item].target === collectionUID
    ) {
      relations.push(item);
    }
  }
  return relations;
}

function getNulls(data): string[] {
  let nullsArray: string[] = [];
  for (const item in data.attributes) {
    if (data.attributes[item] === null) {
      nullsArray.push(item);
    }
  }
  return nullsArray;
}

async function combineWithRelation(
  data,
  dataToCheck,
  nullsArray: string[],
  relations: string[],
  checked: number[],
  collectionUID
) {
  const entry = await strapi.entityService.findOne(
    collectionUID,
    dataToCheck.id,
    {
      fields: [],
      populate: relations.reduce((acc, relation) => {
        acc[relation] = { fields: nullsArray };
        return acc;
      }, {}),
    }
  );

  for (const relation of relations) {
    if (entry[relation] && !checked.includes(entry[relation].id)) {
      for (const item of nullsArray) {
        if (entry[relation][item]) {
          data.attributes[item] = entry[relation][item];
          nullsArray.splice(nullsArray.indexOf(item), 1);
        }
      }
      checked.push(entry[relation].id);

      if (nullsArray.length == 0) {
        return data;
      }

      return combineWithRelation(
        data,
        entry[relation],
        nullsArray,
        relations,
        checked,
        collectionUID
      );
    }
  }
  return data;
}
