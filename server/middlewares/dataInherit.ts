import { Schema } from "@strapi/strapi";
import { Entity } from "@strapi/strapi/lib/core-api/service";
import { Context, Next } from "koa";

declare module "@strapi/strapi" {
  interface Attribute {
    relation?: string;
    target?: string;
  }
}

declare module "koa" {
  interface Context {
    body: {
      data?: Data;
    };
  }
}

interface Data {
  id: number;
  attributes: {
    [key: string]: any;
  };
  [key: string]: any;
}

export default async (ctx: Context, next: Next) => {
  await next();

  if (!ctx.body?.data) {
    return;
  }
  const collectionName = ctx?.request?.url?.split("/")[2];

  const collectionUID = getCollectionUID(collectionName);

  if (!collectionUID) {
    return;
  }

  const relationsNames = getRelationsNames(collectionUID);

  if (relationsNames.length == 0) {
    return;
  }

  const nullsNames = getNullsNames(ctx.body.data, collectionUID);

  if (nullsNames.length == 0) {
    return;
  }

  let idsChecked: number[] = [ctx.body.data.id];
  ctx.body.data = await combineWithRelation(
    ctx.body.data,
    ctx.body.data,
    nullsNames,
    relationsNames,
    idsChecked,
    collectionUID
  );
};

function getCollectionUID(collectionName: string): string | undefined {
  for (const key in strapi.contentTypes) {
    const contentType = strapi.contentTypes[key];
    if (contentType.collectionName === collectionName) {
      return contentType.uid;
    }
  }
}

function getRelationsNames(collectionUID: string): string[] {
  let relationsNames: string[] = [];
  const schema: Schema = strapi.contentTypes[collectionUID].__schema__;

  for (const item in schema.attributes) {
    const itemAttributes = schema.attributes[item];
    if (
      itemAttributes.type === "relation" &&
      itemAttributes.target === collectionUID
    ) {
      relationsNames.push(item);
    }
  }
  return relationsNames;
}

function getNullsNames(data: Data, collectionUID: string): string[] {
  let nullsNames: string[] = [];
  const schema: Schema = strapi.contentTypes[collectionUID].__schema__;
  for (const item in data.attributes) {
    if (!schema.attributes.hasOwnProperty(item)) {
      continue;
    }
    if (!supportedTypes(schema.attributes[item].type)) {
      continue;
    }
    if (schema.attributes[item].type === "component") {
      continue;
    }
    if (schema.attributes[item].type === "media") {
      if (data.attributes[item].data === null) {
        nullsNames.push(item);
      }
    }
    if (data.attributes[item] === null) {
      nullsNames.push(item);
    }
  }
  return nullsNames;
}

function supportedTypes(type: string): boolean {
  let isSupported: boolean;
  if (
    type === "string" ||
    type === "text" ||
    type === "email" ||
    type === "richtext" ||
    type === "password" ||
    type === "biginteger" ||
    type === "decimal" ||
    type === "float" ||
    type === "enumeration" ||
    type === "date" ||
    type === "media" ||
    type === "boolean" ||
    type === "json" ||
    type === "uid" ||
    type === "enumeration"
  ) {
    isSupported = true;
  } else isSupported = false;
  return isSupported;
}

async function combineWithRelation(
  dataToUpdate: Data,
  dataToCheck: { id: number; [key: string]: any },
  nullsNames: string[],
  relationsNames: string[],
  idsChecked: number[],
  collectionUID: string
) {
  const entry = await getRelationData(
    collectionUID,
    dataToCheck.id,
    relationsNames,
    nullsNames
  );

  for (const relation of relationsNames) {
    const relationData: { id: number; [key: string]: any } = entry[relation];
    if (relationData && !idsChecked.includes(relationData.id)) {
      dataToUpdate = compareFieldsAndUpdate(
        nullsNames,
        relationData,
        dataToUpdate,
        collectionUID
      );
      idsChecked.push(relationData.id);

      if (nullsNames.length == 0) {
        return dataToUpdate;
      }

      return combineWithRelation(
        dataToUpdate,
        relationData,
        nullsNames,
        relationsNames,
        idsChecked,
        collectionUID
      );
    }
  }
  return dataToUpdate;
}

async function getRelationData(
  collectionUID: string,
  idToCheck: number,
  relationsNames: string[],
  nullsNames: string[]
): Promise<Entity> {
  let nullsArrayCopy = [...nullsNames];
  let mediaNulls: string[] = [];
  const schema: Schema = strapi.contentTypes[collectionUID].__schema__;
  for (let i = nullsArrayCopy.length - 1; i >= 0; i--) {
    if (schema.attributes[nullsArrayCopy[i]].type === "media") {
      mediaNulls = [...nullsArrayCopy.splice(i, 1), ...mediaNulls];
    }
  }
  return await strapi.entityService.findOne(collectionUID, idToCheck, {
    fields: [],
    populate: relationsNames.reduce((acc, relation) => {
      acc[relation] = { populate: mediaNulls, fields: nullsArrayCopy };
      return acc;
    }, {}),
  });
}

function compareFieldsAndUpdate(
  nullsNames: string[],
  relationData: { id: number; [key: string]: any },
  dataToUpdate: Data,
  collectionUID: string
): Data {
  let tempArrayCopy = [...nullsNames];
  for (const item of nullsNames) {
    if (relationData[item] !== null) {
      const schema: Schema = strapi.contentTypes[collectionUID].__schema__;
      if (
        schema.attributes[item].type === "media" &&
        strapi.contentTypes[collectionUID].__schema__.attributes[item]
          .multiple === false
      ) {
        let organizedData = {
          id: relationData[item].id,
          attributes: { ...relationData[item] },
        };

        delete organizedData.attributes.id;
        dataToUpdate.attributes[item] = { data: organizedData };
      } else if (
        schema.attributes[item].type === "media" &&
        strapi.contentTypes[collectionUID].__schema__.attributes[item]
          .multiple === true
      ) {
        let organizedArray = relationData[item].map((mediaItem) => {
          let data = {
            id: mediaItem.id,
            attributes: { ...mediaItem },
          };
          delete data.attributes.id;
          return data;
        });
        dataToUpdate.attributes[item] = { data: organizedArray };
      } else {
        dataToUpdate.attributes[item] = relationData[item];
      }
      tempArrayCopy.splice(tempArrayCopy.indexOf(item), 1);
    }
  }
  nullsNames = tempArrayCopy;
  return dataToUpdate;
}
