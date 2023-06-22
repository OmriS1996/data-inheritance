# Data Inheritance plugin for Strapi

For inheriting data from related entities of the same content type.

## Case

When you want to have a "father and son" relationship between different items of the same content type.
You can create a main father, which contains all of the information you need, and have a son, related to him, when leaving certain fields of the son empty, it will take the information from the same fields from father, as long as they aren't null there too.
In that case, every time you'll updated information that is relevant to all of the children, they will all recieve it automatically, removing the need of manually changing everything, while also giving the ability to have certain fields having different information from that of the father.
The plugin supports multiple parent and grandparents relationships, it remembers the id's it checked.

Currently supported field types are: Text, Rich Text, Number, Date, Boolean, Email, Password, Enumeration, Media, JSON and UID.
The way Component and Dynamic Zones work is currently too complex for me to intergrate.

## Installation

Either

```
npm install strapi-data-inheritance
```

Or you can just add the folder under the plugins folder in your Strapi project: yourproject/plugins

Afterwards, go to yourproject/config/plugins.ts (if none exists, create one), it should look like this:

```
export default {
  // ...
  "data-inheritance": {
    enabled: true,
    resolve: "./src/plugins/data-inheritance",
  },
  // ...
};
```

The export might look a bit different if you're using JS instead of TypeScript or if you have more plugins, make sure to check Strapi's plugin documentation.
If done correctly, you should see the plugin in your admin panel > general > plugins.

## Usage

Usage is fairly simple.
When creating a content type, add your wanted fields, then add a relation field.
All content types and fields should have unique names.
Make sure the relation is to the same content type and is only one way relation, to avoid infinite loops.
When making a GET request, it should get only the fields that you requested and seamlessly, like using Strapi normally.
Currently, there is no way to choose which content types or specific fields will use the plugin, once it's activated, it covers every GET request.

For further customization, the magic happens in these files:
./server/middlewares/dataInherit.ts
./server/register.ts
The rest are Strapi's plugin template files.

The first file is the actual plugin logic, the second is a life cycle method to register that middleware to the main app.
The rest of the files are simply part of Strapi's plugin template.

Everything was tested on Strapi 4.10.1

## Some credits

Big thanks to [Nisim Joseph](https://www.linkedin.com/in/nisim-joseph-32a678/) who was my mentor for this project, and the great people at [Taboola](https://www.linkedin.com/company/taboola/) who were always happy to help.
