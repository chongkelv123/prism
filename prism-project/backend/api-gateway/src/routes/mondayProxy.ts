// backend/api-gateway/src/routes/mondayProxy.ts
import { Router, Request, Response } from 'express';

const router = Router();

// Define interfaces for Monday.com API responses
interface MondayUser {
  name: string;
  email: string;
  id: string;
  [key: string]: any;
}

interface MondayBoard {
  id: string;
  name: string;
  items_count: number;
  state: string;
  [key: string]: any;
}

interface MondayItem {
  id: string;
  name: string;
  state: string;
  column_values?: any[];
  [key: string]: any;
}

interface MondayAPIResponse {
  data?: any;
  errors?: Array<{ message: string }>;
}

// Simple Monday.com proxy to bypass CORS during development
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { apiToken, apiUrl, boardId } = req.body;
    
    if (!apiToken || !apiUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: apiToken and apiUrl' 
      });
    }

    const steps = [];
    const baseUrl = apiUrl || 'https://api.monday.com/v2';
    
    // Helper function to call Monday.com GraphQL API
    const callMondayAPI = async (query: string, variables: any = {}): Promise<MondayAPIResponse> => {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'API-Version': '2024-01'
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as MondayAPIResponse;
      
      if (result.errors) {
        throw new Error(`API Error: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }
      
      return result;
    };
    
    // Step 1: Test authentication
    console.log('Testing Monday.com connection...');
    try {
      const authQuery = `{ me { name email id } }`;
      const authResult = await callMondayAPI(authQuery);

      if (!authResult.data?.me) {
        throw new Error('Authentication failed - invalid API token');
      }

      const userData = authResult.data.me as MondayUser;
      steps.push({
        step: 'Testing authentication...',
        status: 'success',
        message: `Connected as ${userData.name} (${userData.email})`,
        details: userData
      });
      
    } catch (error: any) {
      steps.push({
        step: 'Testing authentication...',
        status: 'error', 
        message: error.message
      });
      return res.json({ success: false, steps, error: error.message });
    }

    // Step 2: Board discovery
    try {
      const boardsQuery = `{ boards(limit: 50) { id name items_count state } }`;
      const boardsResult = await callMondayAPI(boardsQuery);

      if (!boardsResult.data?.boards) {
        throw new Error('No boards found or access denied');
      }

      const boards = boardsResult.data.boards as MondayBoard[];
      const activeBoards = boards.filter(b => b.state === 'active' && b.items_count > 0);
      
      steps.push({
        step: 'Discovering boards...',
        status: 'success',
        message: `Found ${boards.length} boards (${activeBoards.length} active with items)`,
        details: { totalBoards: boards.length, activeBoards: activeBoards.length, boards: activeBoards.slice(0, 10) }
      });
      
    } catch (error: any) {
      steps.push({
        step: 'Discovering boards...',
        status: 'error',
        message: error.message
      });
      return res.json({ success: false, steps, error: error.message });
    }

    // Step 3: Board access test (if board ID provided)
    if (boardId) {
      try {
        const boardQuery = `
          query($boardId: ID!) {
            boards(ids: [$boardId]) {
              id
              name
              items_count
              state
            }
          }
        `;
        
        const boardResult = await callMondayAPI(boardQuery, { boardId });

        if (!boardResult.data?.boards || boardResult.data.boards.length === 0) {
          throw new Error(`Board ${boardId} not found or not accessible`);
        }

        const board = boardResult.data.boards[0] as MondayBoard;
        steps.push({
          step: 'Testing board access...',
          status: 'success',
          message: `Access granted: ${board.name} (${board.items_count} items)`,
          details: board
        });
        
      } catch (error: any) {
        steps.push({
          step: 'Testing board access...',
          status: 'error',
          message: error.message
        });
        return res.json({ success: false, steps, error: error.message });
      }

      // Step 4: Data retrieval test
      try {
        // Try items_page first (modern approach)
        let itemsQuery = `
          query($boardId: ID!) {
            boards(ids: [$boardId]) {
              items_page(limit: 10) {
                cursor
                items {
                  id
                  name
                  state
                  column_values {
                    id
                    text
                    value
                  }
                }
              }
            }
          }
        `;
        
        let itemsResult;
        let itemsCount = 0;
        let hasColumnData = false;
        
        try {
          itemsResult = await callMondayAPI(itemsQuery, { boardId });
          
          if (itemsResult.data?.boards[0]?.items_page?.items) {
            const items = itemsResult.data.boards[0].items_page.items as MondayItem[];
            itemsCount = items.length;
            hasColumnData = items.some(item => item.column_values && item.column_values.length > 0);
          } else {
            throw new Error('No items found using items_page');
          }
        } catch (itemsPageError) {
          // Fallback to basic items query
          console.log('items_page failed, trying basic items query...');
          
          const basicQuery = `
            query($boardId: ID!) {
              boards(ids: [$boardId]) {
                items(limit: 10) {
                  id
                  name
                  state
                }
              }
            }
          `;
          
          const basicResult = await callMondayAPI(basicQuery, { boardId });
          
          if (basicResult.data?.boards[0]?.items) {
            const items = basicResult.data.boards[0].items as MondayItem[];
            itemsCount = items.length;
            hasColumnData = false;
          } else {
            throw new Error('Cannot access board items - check permissions');
          }
        }
        
        const dataQuality = hasColumnData ? 'with column data' : 'basic data only';
        steps.push({
          step: 'Testing data retrieval...',
          status: 'success',
          message: `Retrieved ${itemsCount} items (${dataQuality})`,
          details: { itemsCount, hasColumnData }
        });
        
      } catch (error: any) {
        steps.push({
          step: 'Testing data retrieval...',
          status: 'error',
          message: error.message
        });
        return res.json({ success: false, steps, error: error.message });
      }
    }

    // All tests passed
    return res.json({ success: true, steps });

  } catch (error: any) {
    console.error('Monday.com proxy error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get boards for selection
router.post('/get-boards', async (req: Request, res: Response) => {
  try {
    const { apiToken, apiUrl } = req.body;
    
    if (!apiToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'API token is required' 
      });
    }

    const baseUrl = apiUrl || 'https://api.monday.com/v2';
    
    const boardsQuery = `{ 
      boards(limit: 100) { 
        id 
        name 
        items_count 
        state 
        description
      } 
    }`;
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'API-Version': '2024-01'
      },
      body: JSON.stringify({ query: boardsQuery })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as MondayAPIResponse;
    
    if (result.errors) {
      throw new Error(`API Error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }
    
    if (!result.data?.boards) {
      throw new Error('No boards found');
    }

    const boards = result.data.boards as MondayBoard[];
    const activeBoards = boards.filter(b => b.state === 'active');
    
    return res.json({ 
      success: true, 
      boards: activeBoards.sort((a, b) => b.items_count - a.items_count) 
    });

  } catch (error: any) {
    console.error('Monday.com get boards error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get boards'
    });
  }
});

export default router;