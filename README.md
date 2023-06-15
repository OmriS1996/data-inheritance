# Strapi plugin data-inheritance

Current used files:
./server/middlewares/dataInherit.ts
./server/register.ts

The first file is the actual plugin logic, the second is a life cycle method to register that middleware to the main app.
The rest of the files are simply part of Strapi's plugin template.

Usage
Just add to the plugins directory in your main application, also add the plugin in the plugins file, according to Strapi's documents.
Make sure that the keys names are all unique.
when making a GET request, it should get only the fields that you requested, like using Strapi normally, only that nulls are populated from a relation of the same entity if one exists.

The plugin only populates all of the "normal" fields, components, relations and Dynamic Zones are not checked.
The plugin iterates over all of the entity's relations, while remembering which relations it already checked.
