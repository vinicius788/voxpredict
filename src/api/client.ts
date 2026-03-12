import { API_CONFIG, getApiUrl, getAuthHeaders } from './config';

// Classe para gerenciar requisições à API
export class ApiClient {
  // GET request
  static async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(getApiUrl(endpoint));
    
    // Adicionar parâmetros de query
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    // Configurar requisição
    const config: RequestInit = {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    };
    
    return this.request<T>(url.toString(), config);
  }
  
  // POST request
  static async post<T>(endpoint: string, data?: any): Promise<T> {
    const config: RequestInit = {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined
    };
    
    return this.request<T>(getApiUrl(endpoint), config);
  }
  
  // PUT request
  static async put<T>(endpoint: string, data?: any): Promise<T> {
    const config: RequestInit = {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined
    };
    
    return this.request<T>(getApiUrl(endpoint), config);
  }
  
  // DELETE request
  static async delete<T>(endpoint: string): Promise<T> {
    const config: RequestInit = {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    };
    
    return this.request<T>(getApiUrl(endpoint), config);
  }
  
  // Função genérica para fazer requisições
  private static async request<T>(url: string, config: RequestInit): Promise<T> {
    // Configurar timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    config.signal = controller.signal;
    
    try {
      // Fazer requisição com retry
      let attempts = 0;
      let lastError: Error | null = null;
      
      while (attempts < API_CONFIG.RETRY_ATTEMPTS) {
        try {
          const response = await fetch(url, config);
          clearTimeout(timeoutId);
          
          // Verificar se a resposta foi bem-sucedida
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error ${response.status}`);
          }
          
          // Parsear resposta como JSON
          return await response.json();
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          // Se não for o último retry, aguardar antes de tentar novamente
          if (attempts < API_CONFIG.RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
          }
        }
      }
      
      // Se chegou aqui, todas as tentativas falharam
      throw lastError || new Error('Request failed after multiple attempts');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Exportar funções de conveniência
export const api = {
  get: ApiClient.get,
  post: ApiClient.post,
  put: ApiClient.put,
  delete: ApiClient.delete
};