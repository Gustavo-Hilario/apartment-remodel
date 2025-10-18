/**
 * Product Options Helper Functions
 * Utilities for managing product options and selections
 */

/**
 * Generate a unique ID for a product option
 */
export function generateOptionId() {
  return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new product option with default values
 */
export function createNewOption() {
  return {
    id: generateOptionId(),
    name: '',
    price: 0,
    url: '',
    description: '',
    images: [],
    notes: '',
  };
}

/**
 * Select a product option and update the item accordingly
 * @param {Object} item - The item to update
 * @param {string} optionId - The ID of the option to select
 * @returns {Object} Updated item with actual_price and selectedProductName set
 */
export function selectProductOption(item, optionId) {
  if (!item.productOptions || item.productOptions.length === 0) {
    return item;
  }

  const selectedOption = item.productOptions.find(opt => opt.id === optionId);

  if (!selectedOption) {
    return item;
  }

  return {
    ...item,
    selectedOptionId: optionId,
    selectedProductName: selectedOption.name,
    actual_price: selectedOption.price,
    subtotal: (item.quantity || 1) * selectedOption.price,
  };
}

/**
 * Clear the selected product option
 * @param {Object} item - The item to update
 * @returns {Object} Updated item with selection cleared
 */
export function clearProductOption(item) {
  return {
    ...item,
    selectedOptionId: '',
    selectedProductName: '',
  };
}

/**
 * Get the currently selected option for an item
 * @param {Object} item - The item
 * @returns {Object|null} The selected option or null
 */
export function getSelectedOption(item) {
  if (!item.selectedOptionId || !item.productOptions) {
    return null;
  }

  return item.productOptions.find(opt => opt.id === item.selectedOptionId) || null;
}

/**
 * Add a new option to an item
 * @param {Object} item - The item
 * @param {Object} option - The option to add
 * @returns {Object} Updated item with the new option
 */
export function addOption(item, option) {
  const productOptions = item.productOptions || [];

  return {
    ...item,
    productOptions: [...productOptions, option],
  };
}

/**
 * Update an existing option
 * @param {Object} item - The item
 * @param {string} optionId - The ID of the option to update
 * @param {Object} updates - The updates to apply
 * @returns {Object} Updated item
 */
export function updateOption(item, optionId, updates) {
  const productOptions = item.productOptions || [];

  const updatedOptions = productOptions.map(opt =>
    opt.id === optionId ? { ...opt, ...updates } : opt
  );

  const updatedItem = {
    ...item,
    productOptions: updatedOptions,
  };

  // If this was the selected option and price changed, update actual_price
  if (item.selectedOptionId === optionId && updates.price !== undefined) {
    updatedItem.actual_price = updates.price;
    updatedItem.subtotal = (item.quantity || 1) * updates.price;
  }

  return updatedItem;
}

/**
 * Delete an option
 * @param {Object} item - The item
 * @param {string} optionId - The ID of the option to delete
 * @returns {Object} Updated item
 */
export function deleteOption(item, optionId) {
  const productOptions = item.productOptions || [];
  const updatedOptions = productOptions.filter(opt => opt.id !== optionId);

  const updatedItem = {
    ...item,
    productOptions: updatedOptions,
  };

  // If we deleted the selected option, clear the selection
  if (item.selectedOptionId === optionId) {
    updatedItem.selectedOptionId = '';
    updatedItem.selectedProductName = '';
  }

  return updatedItem;
}

/**
 * Check if an item has any product options
 * @param {Object} item - The item
 * @returns {boolean}
 */
export function hasOptions(item) {
  return item.productOptions && item.productOptions.length > 0;
}

/**
 * Get option count
 * @param {Object} item - The item
 * @returns {number}
 */
export function getOptionCount(item) {
  return item.productOptions ? item.productOptions.length : 0;
}
