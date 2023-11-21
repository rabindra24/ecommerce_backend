("use strict");
const stripe = require("stripe")(
  "sk_test_51Mc0DRSAtTNV5e6yzGg8iXomzBfOfmCfREjZHMCVbFIEhyD1BcvmlW5p3AmK9XI81Uqxw1nAdSyocaGN6j2EUy1900Y4DTFa0K"
);

/**
 * payment controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::payment.payment", ({ strapi }) => ({
  async create(ctx) {
    const { cart } = ctx.request.body;
    // console.log(cart)
    // console.log(cart[0].attributes.product)
    if (!cart) {
      ctx.response.status = 400;
      return { error: "Cart not found in request" };
    }
    const lineItems = await Promise.all(
      cart.map(async (product) => {
        const item = await strapi
          .service("api::product.product")
          .findOne(product.id);

        console.log(product.attributes.quantity);
        console.log(product.attributes.product.data.attributes.title);
        const price = product.attributes.product.data.attributes.price
        const amount = (price + ((price * 18) / 100)) * 100

        return {
          price_data: {
            currency: "inr",
            product_data: {
              name: product.attributes.product.data.attributes.title,
            },
            unit_amount: amount,
          },
          quantity: product.attributes.quantity,
        };
      })
    );
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/success`,
        cancel_url: `${process.env.CLIENT_URL}/`,
        line_items: lineItems,
        payment_method_types: ["card"],
      });
      await strapi.service("api::payment.payment").create({
        data: {
          products: cart,
          stripeId: session.id,
        },
      });
      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return error;
    }
  },
}));
