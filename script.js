function updateTotal() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const zone =
    $("cartDeliveryZone")?.value || "outside";

  const delivery =
    zone === "dhaka"
      ? Number(deliverySettings.dhakaCharge)
      : Number(deliverySettings.outsideCharge);

  const actualDelivery = cart.length ? delivery : 0;
  const total = subtotal + actualDelivery;

  // অর্ডার ফর্মের hidden input-এ এলাকা পাঠানো
  if ($("orderDeliveryZone")) {
    $("orderDeliveryZone").value = zone;
  }

  if ($("subtotal")) {
    $("subtotal").textContent = cash(subtotal);
  }

  if ($("deliveryFee")) {
    $("deliveryFee").textContent = cash(actualDelivery);
  }

  if ($("total")) {
    $("total").textContent = cash(total);
  }

  if ($("orderSubtotal")) {
    $("orderSubtotal").textContent = cash(subtotal);
  }

  if ($("orderDeliveryFee")) {
    $("orderDeliveryFee").textContent = cash(actualDelivery);
  }

  if ($("grandTotal")) {
    $("grandTotal").textContent = cash(total);
  }
}
