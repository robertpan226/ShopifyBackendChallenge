Shopify Backend Coding Challenge Summer 2019

I've implemented the marketplace using a nodejs express mongodb stack. It features:
- A marketplace that allows adding/removing products
- A shopping cart that allows you to add/remove/purchase products in the cart
- Error checking ie. " " as a title name for a product or prompting user if a db call fails
- Error statements ie. checking out a cart that's empty or adding an product to cart where requested quantity > inventory_count
- Endpoints that are grouped together ie. checking out the cart is '/cart/checkout' and retrieving the cart is '/cart'

Design/Thought Process:
- Database is split into two, ITEM_DB to hold all the items in the marketplace and CART_DB to track all cart instances and the items in each individual cart.
- Marketplace is currently set up to only allow unique product titles, meaning there cannot be two or more products with the same title. I can easily modify my code to query based on the generated shortid instead of product title to allow for multiple products with the same title.
- A cart system that operates as you would expect, you must add an item to the cart in order to "purchase" the item and you must check out the entire cart. Currently it is only set up to track 1 cart, however it would be easy to alter the code to allow for multiple cart instances. I would just query the cart database with the generated shortid instead of querying everything in the cart db and using the first element.
