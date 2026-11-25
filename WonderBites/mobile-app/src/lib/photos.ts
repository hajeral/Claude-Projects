import type { PhotoKey } from '../api/types';

// Product photos (the food itself, never a shop logo). Replace with merchant
// uploads (Bag.photoUrl) when the API is live.
export const photos: Record<PhotoKey, number> = {
  cafe_pastries: require('../../assets/img/cafe_pastries.jpg'),
  salad_pink: require('../../assets/img/salad_pink.jpg'),
  salmon_plate: require('../../assets/img/salmon_plate.jpg'),
  groceries: require('../../assets/img/groceries.jpg'),
  store_shelves: require('../../assets/img/store_shelves.jpg'),
  donut_interim: require('../../assets/img/donut_interim.jpg'),
  fish_plate: require('../../assets/img/fish_plate.jpg'),
  grill_spread: require('../../assets/img/grill_spread.jpg'),
  salad_juice: require('../../assets/img/salad_juice.jpg'),
  croissant: require('../../assets/img/croissant.jpg'),
  basket: require('../../assets/img/basket.jpg'),
  bowl: require('../../assets/img/bowl.jpg'),
  drink: require('../../assets/img/drink.jpg'),
  pinkbox: require('../../assets/img/pinkbox.jpg'),
  box_light: require('../../assets/img/box_light.jpg'),
  ob1_box: require('../../assets/img/ob1_box.jpg'),
  ob2_baker: require('../../assets/img/ob2_baker.jpg'),
  ob2_shelves: require('../../assets/img/ob2_shelves.jpg'),
  ob3_covered: require('../../assets/img/ob3_covered.jpg'),
  ob3_joy: require('../../assets/img/ob3_joy.jpg'),
  welcome_cafe: require('../../assets/img/welcome_cafe.jpg'),
  done_bag: require('../../assets/img/done_bag.jpg'),
  collect_qr: require('../../assets/img/collect_qr.jpg'),
  unbox_tissue: require('../../assets/img/unbox_tissue.jpg'),
  dn_full: require('../../assets/img/dn_full.jpg'),
};

export const waxSeal = require('../../assets/img/wax_seal.png');
