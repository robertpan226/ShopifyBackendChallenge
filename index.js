const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const expressMongoDb = require('express-mongo-db');
const MongoClient = require('mongodb').MongoClient;
const utils = require('./utils.js');
const shortid = require('shortid');

const MONGO_URL = 'mongodb://localhost:27017/marketplace';
const ITEM_DB = 'items';
const CART_DB = 'cart';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressMongoDb(MONGO_URL));

MongoClient.connect(MONGO_URL, function(err, client) {
    const db = client.db('marketplace');
});

const port = 3000;

app.post('/items/add', function(req, res) { // POST request to add new items to the marketplace
    const newItem = {
        itemID: shortid.generate(), // in case we decide to allow duplicate product titles, the itemID can serve as an unique identifer to the product
        title: req.body.title,
        price: req.body.price,
        inventory_count: req.body.inventory_count
    };

    if (utils.invalidInput(newItem.title)){
        res.status(400).send('Invalid item title entered.');
        return;
    }

    if (utils.invalidInput(newItem.price)){
        res.status(400).send('Invalid item price entered.');
        return;
    }

    if (utils.invalidInput(newItem.inventory_count)){
        res.status(400).send('Invalid item inventory_count entered.');
        return;
    }

    req.db.collection(ITEM_DB).find({ title: newItem.title }).toArray(function(err, item) {
        if (err) { // error handling for unexpected DB errors
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (item.length == 1) { // to check if the new item's title is already taken, this marketplace currently only allows for unique item titles
            res.status(409).send('Error, title name already taken.');
            return;
        }
        req.db.collection(ITEM_DB).insertOne(newItem, function(err) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            res.send('ok');
        });
    });
});

app.delete('/items/remove/', function(req, res) { // DELETE request to remove an item from the marketplace
    const itemTitle = req.body.item;

    req.db.collection(ITEM_DB).find({ title: itemTitle }).toArray(function(err, item) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (item.length < 1) {
            res.status(404).send('Invalid item ID.');
            return;
        }
        req.db.collection(ITEM_DB).deleteOne({ title: itemTitle }, function(err) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            req.db.collection(CART_DB).find().toArray(function(err, cart) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                if (cart.length < 1) {
                    res.status(404).send('There is no item to delete from cart');
                }

                let itemExist = false;

                for (let index = 0; index < cart[0].items.length; index++) {
                    if (cart[0].items[index].item == itemTitle) {
                        cart[0].total -= Number(item[0].price) * cart[0].items[index].quantity;
                        itemExist = true;
                        break;
                    }
                }

                if (itemExist) { // Removed item from marketplace was in cart, so we update the cart with the item removed
                    const filteredCart = cart[0].items.filter(removeItem => removeItem.item != item[0].title);

                    req.db.collection(CART_DB).updateOne({ cartID: cart[0].cartID }, { $set: { items: filteredCart, total: cart[0].total } }, function(err) {
                        if (err) {
                            utils.handleUnexpectedError(err, res);
                            return;
                        }
                        res.send('ok');
                    });
                }
            });
        });
    });
});

app.get('/items', function(req, res) { // GET request to fetch all marketplace items
    req.db.collection(ITEM_DB).find().toArray(function(err, items) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (items.length < 1) {
            res.status(404).send('There are no items currently in the marketplace');
            return;
        }
        res.send(items);
    });
});

app.post('/items/query', function(req, res) { // POST request to query items with a specific title and option to return only in-stock items
    const query = req.body.query;
    const returnAvail = JSON.parse(req.body.returnAvail);

    req.db.collection(ITEM_DB).find({ title: query }).toArray(function(err, items) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (items.length < 1) {
            res.status(404).send('No items were found with that title.');
            return;
        }
        if (returnAvail) {
            const filteredItems = items.filter(item => item.inventory_count > 0);
            if (filteredItems.length < 1) {
                res.status(404).send('No items with that title are currently in-stock.');
                return;
            }
            res.send(filteredItems);
        } else {
            res.send(items);
        }
    });
});

app.get('/cart', function(req, res) { // GET request to fetch your shopping cart and returns it. If a shopping cart doesn't exist, one will be created and returned
    req.db.collection(CART_DB).find().toArray(function(err, cart) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (cart.length < 1) {
            const newCart = {
                cartID: shortid.generate(), // to allow for multiple cart instances in the future, currently only supports 1 cart  
                items: [],
                total: 0 // current subtotal in the cart
            };
            req.db.collection(CART_DB).insertOne(newCart, function(err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send(newCart);
            });
        } else {
            res.send(cart[0]);
        }
    });
});

app.post('/cart/add', function(req, res) { // POST request to add items to the shopping cart
    const quantity = Number(req.body.quantity);
    const addItem = req.body.item;

    req.db.collection(ITEM_DB).find({ title: addItem }).toArray(function(err, item) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (item.length < 1) {
            res.status(404).send('This item does not exist.');
            return;
        }

        item = item[0];

        req.db.collection(CART_DB).find().toArray(function(err, cart) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            if (cart.length < 1) {
                res.status(404).send('There is no cart to add to.');
                return;
            }

            let itemExist = false;

            for (let index = 0; index < cart[0].items.length; index++) {
                const currentItem = cart[0].items[index];
                if (currentItem.item == addItem) { // checking if the item is already in the cart, so we can just add the extra quantities to it
                    if (quantity + currentItem.quantity > item.inventory_count) {
                        res.status(400).send('Cannot add to cart. Invalid quantity selected for this item.');
                        return;
                    }
					
                    currentItem.quantity += quantity;
                    cart[0].total += item.price * quantity;

                    req.db.collection(CART_DB).updateOne({ cartID: cart[0].cartID }, { $set: { items: cart[0].items, total: cart[0].total } }, function(err) {
                        if (err) {
                            utils.handleUnexpectedError(err, res);
                            return;
                        }
                        res.send('ok');
                    });

                    itemExist = true;
                    break;
                }
            }
            if (!itemExist) { // item is not in cart, so add it to the cart
                if (quantity > item.inventory_count) {
                    res.status(400).send('Cannot add to cart. Invalid quantity selected for this item.');
                    return;
                }

                const cartItem = {
                    item: addItem,
                    quantity: quantity
                };

                cart[0].items.push(cartItem);
                cart[0].total += item.price * quantity;

                req.db.collection(CART_DB).updateOne({ cartID: cart[0].cartID }, { $set: { items: cart[0].items, total: cart[0].total } }, function(err) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    res.send('ok');
                });
            }
        });
    });
});

app.delete('/cart/remove', function(req, res) { // REMOVE request to remove items from the cart
    const removeItem = req.body.item;
    const quantity = Number(req.body.quantity);
	
    req.db.collection(ITEM_DB).find({ title: removeItem }).toArray(function(err, items) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (items.length < 1) {
            res.status(404).send('This item does not exist.');
            return;
        }
        req.db.collection(CART_DB).find().toArray(function(err, cart) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            if (cart.length < 1) {
                res.status(404).send('There is no cart to remove from.');
                return;
            }

            let itemExist = false;

            for (let index = 0; index < cart[0].items.length; index++) {
                const currentItem = cart[0].items[index];
                if (currentItem.item == removeItem) { // checking if the item is already in the cart, so we can just add the extra quantities to it
                    if (quantity > currentItem.quantity) {
                        res.status(400).send('Invalid quantity to remove for the specific quantity.');
                        return;
                    }
					
                    currentItem.quantity -= quantity;
                    cart[0].total -= Number(items[0].price) * quantity;

                    if (currentItem.quantity == 0) {
                        const filteredCart = cart.items.filter(item => item.quantity > 0);
                    }

                    req.db.collection(CART_DB).updateOne({ cartID: cart[0].cartID }, { $set: { items: cart[0].items, total: cart[0].total } }, function(err) {
                        if (err) {
                            utils.handleUnexpectedError(err, res);
                            return;
                        }
                        res.send('ok');
                    });

                    itemExist = true;

                    break;
                }
            }

            if (!itemExist) {
                res.status(404).send('This item does not exist in the cart.');
                return;
            }
        });
    });
});

app.get('/cart/checkout', function(req, res) {
    req.db.collection(CART_DB).find().toArray(function(err, cart) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (cart.length < 1) {
            res.status(404).send('There is no cart to checkout.');
            return;
        }

        let cartItems = []; // list of items names in the cart
        let cartMap = new Map(); // to map cart items to purchasing quantity

        for (let index = 0; index < cart[0].items.length; index++) {
            cartItems.push(cart[0].items[index].item);
            cartMap.set(cart[0].items[index].item, cart[0].items[index].quantity);
        }

        req.db.collection(ITEM_DB).find({ title: { $in: cartItems }}).toArray(function(err, checkoutItems) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            if (checkoutItems.length < 1) {
                res.status(400).send('There are no cart items to checkout.');
                return;
            }
            for (let checkoutIndex = 0; checkoutIndex < checkoutItems.length; checkoutIndex++) {
                const currentItem = checkoutItems[checkoutIndex];
                const updatedItemQuantity = Number(currentItem.inventory_count) - Number(cartMap.get(currentItem.title)); 
                req.db.collection(ITEM_DB).updateOne({ title: currentItem.title }, { $set: { inventory_count: updatedItemQuantity } }, function(err) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    req.db.collection(CART_DB).deleteOne({ cartID: cart[0].cartID }, function(err) {
                        if (err) {
                            utils.handleUnexpectedError(err, res);
                            return;
                        }
                        res.send({
                            status: 'ok',
                            total: cart[0].total
                        });
                    });
                });
            }
        });
    });
});

app.listen(port, () => console.log('Serving root on port ' + port));
