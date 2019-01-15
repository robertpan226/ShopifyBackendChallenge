Shopify Backend Coding Challenge Summer 2019

I've implemented the marketplace using a nodejs express mongodb stack. It features:
- A marketplace that allows adding/removing products
- A shopping cart that allows you to add/remove/purchase products in the cart
- Error checking ie. " " as a title name for a product or prompting user if a db call fails
- Error statements ie. checking out a cart that's empty or adding an product to cart where requested quantity > inventory_count
- Appropriate HTTPS status codes to error messages
- Endpoints that are grouped together ie. checking out the cart is '/cart/checkout' and retrieving the cart is '/cart'

Design/Thought Process:
- Database is split into two, ITEM_DB to hold all the items in the marketplace and CART_DB to track all cart instances and the items in each individual cart.
- Marketplace is currently set up to only allow unique product titles, meaning there cannot be two or more products with the same title. I can easily modify my code to query based on the generated shortid instead of product title to allow for multiple products with the same title.
- A cart system that operates as you would expect, you must add an item to the cart in order to "purchase" the item and you must check out the entire cart. Currently it is only set up to track 1 cart, however it would be easy to alter the code to allow for multiple cart instances. I would just query the cart database with the generated shortid instead of querying everything in the cart db and using the first element.

Endpoints:

POST `/items/add` - Takes in strings: title, price, and inventory_count and adds the new item to the marketplace

DELETE `/items/remove` - Takes in a string: title and removes the item with the same title

GET `/items` - Returns all marketplace items

POST `/items/query` - Returns items which fits title query and consumes a string: query which is the search query and the boolean: returnAvail which determines whether to return out of stock items

GET `/cart` - Returns your shopping cart. If a shopping cart does not exist, one is created and returned

POST `/cart/add` - Takes in a string: item which is the title of the item to add to the cart and a string: quantity which is the number of items to add to cart

DELETE `/cart/remove` - Takes in string: item which is the title of the item to remove from the cart and the string: quantity which is the number of items to remove from the cart

GET `/cart/checkout` - Checks out your cart, deducts the number of items in your cart from the inventory_count and returns a status code of the request along with a string: total which is the total cost of the cart if the request was successful

To install:

Clone this repo, type `npm install` and then `npm start`. The database will initially be empty and will have to be populated with POST `/items/add` manually.
