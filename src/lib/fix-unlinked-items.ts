// Fix unlinked items script
import { db } from './instant';
import { log } from './logger';

export const fixUnlinkedItems = async () => {
  try {
    log.info('Starting fix for unlinked items', 'FixUnlinkedItems');

    // Query all items (no store filtering needed)
    const { data: allItemsData } = await db.queryOnce({
      items: {
        product: {}
      }
    });

    const allItems = allItemsData?.items || [];
    log.info(`Found ${allItems.length} total items`, 'FixUnlinkedItems', { itemsCount: allItems.length });
    
    // Find items that have productId but no product link
    const unlinkedItems = allItems.filter(item => 
      item.productId && (!item.product || (item.product as any).length === 0)
    );

    log.info(`Found ${unlinkedItems.length} unlinked items`, 'FixUnlinkedItems', { unlinkedCount: unlinkedItems.length });

    if (unlinkedItems.length > 0) {
      // Create link transactions for unlinked items
      const linkTransactions = unlinkedItems.map(item => {
        log.debug(`Linking item ${item.id} to product ${item.productId}`, 'FixUnlinkedItems', { itemId: item.id, productId: item.productId });
        return db.tx.items[item.id].link({ product: item.productId });
      });

      await db.transact(linkTransactions);
      log.info(`Successfully fixed ${unlinkedItems.length} unlinked items`, 'FixUnlinkedItems', { fixedCount: unlinkedItems.length });

      return {
        success: true,
        fixed: unlinkedItems.length,
        message: `Fixed ${unlinkedItems.length} unlinked items`
      };
    } else {
      log.info('No unlinked items found', 'FixUnlinkedItems');
      return {
        success: true,
        fixed: 0,
        message: 'No unlinked items found'
      };
    }
  } catch (error) {
    log.error('Failed to fix unlinked items', 'FixUnlinkedItems', { error: error instanceof Error ? error.message : 'Unknown error' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fix unlinked items'
    };
  }
};

// Function to verify item links
export const verifyItemLinks = async (storeId: string) => {
  try {
    const { data } = await db.queryOnce({
      items: {
        $: { where: { storeId } },
        product: {}
      }
    });

    const items = data?.items || [];
    const linkedItems = items.filter(item => item.product && (item.product as any).length > 0);
    const unlinkedItems = items.filter(item => 
      item.productId && (!item.product || (item.product as any).length === 0)
    );

    return {
      total: items.length,
      linked: linkedItems.length,
      unlinked: unlinkedItems.length,
      unlinkedItems: unlinkedItems.map(item => ({
        id: item.id,
        sku: item.sku,
        productId: item.productId
      }))
    };
  } catch (error) {
    log.error('Failed to verify item links', 'VerifyItemLinks', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
};
