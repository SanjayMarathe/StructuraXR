export class AgentManager {
    private backendUrl: string;
    
    constructor(backendUrl: string = 'http://localhost:3001') {
        this.backendUrl = backendUrl;
    }

    async analyzeStructure(sceneDescription: string): Promise<string> {
        console.log("🔍 Analyzing structure with Claude...");
        
        try {
            const response = await fetch(`${this.backendUrl}/api/analyze-structure`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sceneDescription })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.feedback;
        } catch (e) {
            console.error('❌ Error analyzing structure:', e);
            return "Error: Could not connect to backend. Make sure the backend server is running on port 3001.";
        }
    }

    async generateStructure(prompt: string): Promise<any[]> {
        console.log("📐 Generating structure with Claude...");
        
        try {
            const response = await fetch(`${this.backendUrl}/api/generate-structure`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (e) {
            console.error('❌ Error generating structure:', e);
            throw e;
        }
    }

    async generateVariants(prompt: string, count: number = 5): Promise<Array<{description: string, data: any[]}>> {
        console.log(`📐 Generating ${count} structure variants with Claude...`);
        console.log(`🔗 Backend URL: ${this.backendUrl}`);
        
        try {
            const requestBody = { prompt, count };
            console.log('📤 Sending request:', JSON.stringify(requestBody));
            
            const response = await fetch(`${this.backendUrl}/api/generate-variants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log(`📥 Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Backend error: ${response.status} ${response.statusText}`);
                console.error(`❌ Error details: ${errorText}`);
                throw new Error(`Backend error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Received ${result.variants?.length || 0} variants`);
            
            if (!result.variants || result.variants.length === 0) {
                throw new Error('No variants returned from backend');
            }
            
            return result.variants;
        } catch (e: any) {
            console.error('❌ Error generating variants:', e);
            console.error('❌ Error details:', e.message);
            console.error('❌ Backend URL was:', this.backendUrl);
            
            // Check if it's a network error
            if (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')) {
                console.error('❌ Network error - backend may not be accessible');
                console.error('💡 Make sure:');
                console.error('   1. Backend server is running on port 3001');
                console.error('   2. Port forwarding is set up: adb reverse tcp:3001 tcp:3001');
                console.error('   3. Backend URL is correct:', this.backendUrl);
            }
            
            throw e; // Re-throw to let caller handle it
        }
    }
}
