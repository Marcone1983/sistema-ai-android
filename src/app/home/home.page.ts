import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonChip, IonLabel,
  IonItem, IonTextarea, IonButton, IonIcon, IonFab, IonFabButton,
  IonProgressBar, LoadingController, ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, checkmarkDone, close, refresh } from 'ionicons/icons';

interface Message {
  type: 'user' | 'ai' | 'system' | 'error' | 'consensus';
  content: string;
  timestamp: Date;
  modelName?: string;
}

interface AIResponse {
  model: string;
  response: string;
  success: boolean;
  error?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonChip, IonLabel,
    IonItem, IonTextarea, IonButton, IonIcon, IonFab, IonFabButton,
    IonProgressBar
  ],
})
export class HomePage implements OnInit {
  // CONFIGURAZIONE ANTI-FAKE
  private readonly BANNED_TERMS = [
    'placeholder', 'mock', 'demo', 'fake', 'example', 'sample',
    'lorem ipsum', 'test data', 'dummy', 'template', 'echo',
    'coming soon', 'not implemented', 'todo', 'fixme'
  ];

  // MODELLI AI E RUOLI
  availableModels: string[] = [];
  activeModels: string[] = [];
  
  private readonly AI_ROLES = [
    'Senior Developer', 'AI Architect', 'Security Expert', 'UX Designer',
    'Data Scientist', 'DevOps Engineer', 'Product Manager', 'QA Specialist',
    'Backend Expert', 'Frontend Expert', 'Mobile Developer', 'Cloud Architect',
    'Database Expert', 'API Specialist', 'Performance Expert', 'Code Reviewer',
    'System Analyst', 'Business Analyst', 'Technical Writer', 'Solution Architect',
    'Machine Learning Engineer', 'Blockchain Expert', 'IoT Specialist', 'Game Developer',
    'Cybersecurity Analyst', 'Network Engineer', 'Infrastructure Expert', 'Automation Expert',
    'Integration Specialist', 'Microservices Expert', 'Containerization Expert', 'Monitoring Expert',
    'Deployment Expert', 'Testing Expert', 'Documentation Expert', 'Optimization Expert',
    'Scalability Expert', 'Reliability Engineer', 'Platform Engineer', 'Site Reliability Engineer',
    'Research Scientist', 'Innovation Expert', 'Strategy Consultant', 'Technology Evangelist',
    'Open Source Expert', 'Community Manager', 'Technical Lead', 'Engineering Manager',
    'CTO Advisor', 'Startup Mentor', 'Enterprise Architect', 'Digital Transformation Expert',
    'Agile Coach', 'Scrum Master', 'Project Manager', 'Release Manager',
    'Configuration Manager', 'Change Manager', 'Risk Analyst', 'Compliance Expert',
    'Legal Tech Expert', 'Patent Analyst', 'IP Specialist', 'Licensing Expert',
    'Market Analyst', 'Competitive Intelligence', 'Technology Scout', 'Trend Analyst',
    'Innovation Catalyst', 'Disruption Expert', 'Future Tech Visionary', 'Emerging Tech Expert',
    'AI Ethics Expert', 'Privacy Engineer', 'Accessibility Expert', 'Sustainability Expert',
    'Green Tech Specialist', 'Energy Efficiency Expert', 'Carbon Footprint Analyst', 'ESG Tech Expert',
    'Quantum Computing Expert', 'Edge Computing Specialist', 'AR/VR Developer', 'Metaverse Architect',
    'Web3 Developer', 'DeFi Expert', 'NFT Specialist', 'Crypto Developer',
    'Smart Contract Auditor', 'Tokenomics Expert', 'DAO Architect', 'DApp Developer',
    'Cross-Platform Expert', 'Progressive Web App Expert', 'Serverless Expert', 'JAMstack Expert',
    'Headless CMS Expert', 'API Gateway Expert', 'Event-Driven Expert', 'Real-time Expert',
    'Streaming Expert', 'Big Data Expert', 'Analytics Expert', 'Visualization Expert',
    'Business Intelligence Expert', 'Data Warehouse Expert', 'ETL Expert', 'Data Pipeline Expert',
    'MLOps Engineer', 'AI/ML Platform Expert', 'Computer Vision Expert', 'NLP Expert',
    'Robotics Engineer', 'Autonomous Systems Expert', 'Drone Technology Expert', 'Smart City Expert',
    'FinTech Expert', 'HealthTech Expert', 'EdTech Expert', 'AgriTech Expert',
    'CleanTech Expert', 'SpaceTech Expert', 'BioTech Expert', 'NanoTech Expert',
    'Materials Science Expert', 'Advanced Manufacturing Expert', 'Industry 4.0 Expert', 'Digital Twin Expert',
    'Simulation Expert', 'Modeling Expert', 'Optimization Expert', 'Algorithm Expert',
    'Complexity Expert', 'Systems Thinking Expert', 'Design Thinking Expert', 'Human-Centered Design Expert',
    'User Research Expert', 'Behavioral Expert', 'Psychology Expert', 'Cognitive Science Expert',
    'Neuroscience Expert', 'Brain-Computer Interface Expert', 'Bioinformatics Expert', 'Computational Biology Expert'
  ];

  // STATO APPLICAZIONE
  messages: Message[] = [];
  currentQuestion: string = '';
  isProcessing: boolean = false;
  progressValue: number = 0;

  // CONFIGURAZIONE API
  private readonly API_BASE_URL = 'https://mvliltlvvpeynrpyblam.supabase.co/functions/v1';
  private readonly SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bGlsdGx2dnBleW5ycHlibGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODEwMjMsImV4cCI6MjA3Mjg1NzAyM30.UA9l_kRB1X3f0lw4Zu9As1QJ61gGOoZIPddXw5y8yrY';

  constructor(
    private http: HttpClient,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ send, checkmarkDone, close, refresh });
  }

  async ngOnInit() {
    await this.loadAvailableModels();
    this.addSystemMessage('🚀 Sistema 128 Modelli AI inizializzato!');
    this.addSystemMessage('Seleziona i modelli AI e inizia a fare domande.');
  }

  async loadAvailableModels() {
    try {
      const loading = await this.loadingController.create({
        message: 'Caricamento modelli AI...',
        spinner: 'crescent'
      });
      await loading.present();

      // Carica modelli da Supabase Edge Function
      const response = await this.http.get<{models: string[]}>(`${this.API_BASE_URL}/ai-orchestrator-30`, {
        headers: {
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }).toPromise();

      if (response && response.models) {
        this.availableModels = response.models;
        // Seleziona automaticamente i primi 10 modelli
        this.activeModels = this.availableModels.slice(0, 10);
        this.addSystemMessage(`✅ Caricati ${this.availableModels.length} modelli AI. ${this.activeModels.length} attivi.`);
      } else {
        throw new Error('Nessun modello ricevuto');
      }

      await loading.dismiss();
    } catch (error) {
      console.error('Errore caricamento modelli:', error);
      await this.loadingController.dismiss();
      
      // Fallback con modelli predefiniti
      this.availableModels = this.generateFallbackModels();
      this.activeModels = this.availableModels.slice(0, 10);
      
      this.addSystemMessage(`⚠️ Caricamento da server fallito. Usando ${this.availableModels.length} modelli locali.`);
    }
  }

  private generateFallbackModels(): string[] {
    return [
      'deepseek-r1:70b', 'deepseek-r1:14b', 'deepseek-r1:8b', 'deepseek-r1:7b',
      'llama3.3:70b', 'llama3.1:8b', 'llama3.2:3b', 'llama3.2:1b',
      'gemma3:27b', 'gemma3:12b', 'gemma3:4b', 'gemma3:1b',
      'mistral:latest', 'mistral:7b', 'mistral-nemo:latest', 'mixtral:latest',
      'qwen2.5:32b', 'qwen2.5:14b', 'qwen2.5:7b', 'qwen2.5:3b',
      'phi4:14b', 'codegeex4:latest', 'llava:latest', 'openchat:latest'
    ];
  }

  getModelRole(index: number): string {
    return this.AI_ROLES[index % this.AI_ROLES.length];
  }

  getModelShortName(model: string): string {
    return model.split(':')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  }

  isModelActive(model: string): boolean {
    return this.activeModels.includes(model);
  }

  toggleModel(model: string) {
    if (this.isModelActive(model)) {
      this.activeModels = this.activeModels.filter(m => m !== model);
    } else {
      this.activeModels.push(model);
    }
  }

  selectAllModels() {
    this.activeModels = [...this.availableModels];
    this.addSystemMessage(`✅ Selezionati tutti i ${this.activeModels.length} modelli AI.`);
  }

  clearAllModels() {
    this.activeModels = [];
    this.addSystemMessage('🗑️ Deselezionati tutti i modelli AI.');
  }

  async processQuestion() {
    if (!this.currentQuestion?.trim() || this.activeModels.length === 0) {
      await this.showToast('Inserisci una domanda e seleziona almeno un modello AI.', 'warning');
      return;
    }

    // Verifica anti-fake
    if (this.containsBannedTerms(this.currentQuestion)) {
      await this.showAlert('Domanda non valida', 'La domanda contiene termini non consentiti. Evita placeholder, mock, demo, fake, etc.');
      return;
    }

    this.isProcessing = true;
    this.progressValue = 0;

    // Aggiungi messaggio utente
    this.addUserMessage(this.currentQuestion);
    const question = this.currentQuestion;
    this.currentQuestion = '';

    try {
      this.addSystemMessage(`🔄 Analizzando con ${this.activeModels.length} modelli AI...`);

      // Chiama Edge Function per orchestrazione
      const response = await this.callAIOrchestrator(question);
      
      if (response && response.consensus) {
        // Verifica anti-fake nella risposta
        if (this.containsBannedTerms(response.consensus)) {
          throw new Error('Risposta contiene contenuti non consentiti (placeholder/mock/demo)');
        }
        
        this.addConsensusMessage(response.consensus);
        this.addSystemMessage(`✅ Analisi completata con successo!`);
      } else {
        throw new Error('Nessuna risposta ricevuta dall\'orchestrator');
      }

    } catch (error) {
      console.error('Errore processamento:', error);
      this.addErrorMessage(`❌ Errore: ${error}`);
    } finally {
      this.isProcessing = false;
      this.progressValue = 0;
    }
  }

  private async callAIOrchestrator(question: string): Promise<any> {
    const payload = {
      question: question,
      models: this.activeModels,
      rounds: 1,
      anti_fake: true,
      banned_terms: this.BANNED_TERMS
    };

    return this.http.post(`${this.API_BASE_URL}/ai-orchestrator-30`, payload, {
      headers: {
        'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    }).toPromise();
  }

  private containsBannedTerms(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.BANNED_TERMS.some(term => lowerText.includes(term.toLowerCase()));
  }

  private addUserMessage(content: string) {
    this.messages.push({
      type: 'user',
      content: content,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  private addConsensusMessage(content: string) {
    this.messages.push({
      type: 'consensus',
      content: content,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  private addSystemMessage(content: string) {
    this.messages.push({
      type: 'system',
      content: content,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  private addErrorMessage(content: string) {
    this.messages.push({
      type: 'error',
      content: content,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
