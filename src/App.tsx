



import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { generateSpeech, generateCalendarSuggestion, generateNewsScript, getLatestHeadlines, getAssistantResponse } from './services/geminiService';
// FIX: Import the 'NewsArticle' type to resolve the 'Cannot find name' error.
import type { Message, Settings, CallRecord, View, AiMode, CallState, WhiteboardElement, ProactiveAction, SearchFilterType, JobListing, ProactiveSuggestion, StudyHubItem, StudyProgress, Flashcard, ProactiveCalendarSuggestionContent, CalendarEvent, SharedSessionState, DataFileContent, Workflow, UserProfile, Persona, QuizContent, DebateContent, NewsArticle } from './lib/types';
import { DEFAULT_SETTINGS, AI_MODES, VOICE_NAMES, WORKFLOW_ACTIONS } from './lib/constants';
import { getUpcomingEvents, addCalendarEvent, deleteCalendarEvent } from './services/calendarService';

// Import organized CSS files
import './styles/variables.css';
import './styles/animations.css';
import './styles/utilities.css';
import { useAuth } from './hooks/useAuth';
import ApiKeyWarning from './components/ApiKeyWarning';
import { ChatUI } from './components/ChatUI';
import SettingsScreen from './components/SettingsScreen';
import DeepSpaceBackground from './components/DeepSpaceBackground';
import { Keyboard, BarChart3, Globe, X, Loader, BookOpen, Calendar, ArrowLeft, Plus, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { LiveAPIProvider, useLiveAPIContext } from './contexts/LiveAPIContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import StatsModal from './components/StatsModal';
import WhiteboardView from './components/WhiteboardView';
import ProactiveActionModal from './components/ProactiveActionModal';
import AgentPresence from './components/AgentPresence';
import SharedContentViewer from './components/SharedContentViewer';
import MeetingSetupModal from './components/MeetingSetupModal';
import StudyHubScreen, { ProgressTracker } from './components/StudyHubScreen';
import CalendarScreen, { EventFormModal } from './components/CalendarScreen';
import WorkflowEditorModal from './components/WorkflowEditorModal';
import SubscriptionModal from './components/SubscriptionModal';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import { useMessageHandling } from './hooks/useMessageHandling';
import { audioManager } from './lib/utils';
import OnboardingGuide from './components/OnboardingGuide';
import LiveRadioPlayer from './components/LiveRadioPlayer';
import { QuizShowUI } from './components/QuizConsole';
import DebateStageUI from './components/DebateStageUI';
import TranslatorConsole from './components/TranslatorConsole';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import AIWritingAssistant from './components/AIWritingAssistant';
import CodeHelper from './components/CodeHelper';
import VoiceJournal from './components/VoiceJournal';
import DashboardScreen from './components/DashboardScreen';
import AppDrawer from './components/AppDrawer';
import Taskbar from './components/Taskbar';
import MobileFooter from './components/MobileFooter';
import { Logo } from './components/Logo';


declare const pdfjsLib: any;
declare const mammoth: any;
declare const FaceMesh: any;

// --- NEW DESKTOP SIDEBAR COMPONENT ---
const SidebarClock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return (
        <div className="text-center">
            <p className="text-4xl font-light text-cyan-300">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-xs text-gray-400">{time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
    );
};

const AppButton: React.FC<{
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}> = ({ label, icon: Icon, isActive, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`sidebar-app-button ${isActive ? 'active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={label}
    >
        <div className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10">
            <Icon size={24} className={isActive ? 'text-cyan-300' : 'text-gray-400'}/>
        </div>
        <span className="label">{label}</span>
    </button>
);


const Sidebar: React.FC<{
  currentUser: UserProfile | null;
  logout: () => void;
  activeView: View;
  setView: (view: View) => void;
  activeMode: AiMode;
  setAiMode: (mode: AiMode) => void;
  persona: Persona;
  callState: CallState;
}> = ({ currentUser, logout, activeView, setView, activeMode, setAiMode, persona, callState }) => {
    const isCallActive = callState !== 'idle' && callState !== 'standby';

    const apps = [
      ...AI_MODES.map(m => ({
        label: m.name,
        icon: m.iconComponent,
        onClick: () => {
            setAiMode(m.mode);
            setView('chat');
        },
        isActive: activeView === 'chat' && activeMode === m.mode
      })),
      { label: 'Calendar', icon: Calendar, onClick: () => setView('calendar'), isActive: activeView === 'calendar'},
      { label: 'Study Hub', icon: BookOpen, onClick: () => setView('studyHub'), isActive: activeView === 'studyHub'},
      { label: 'AI Writer', icon: AIWritingAssistant, onClick: () => setView('aiWriter'), isActive: activeView === 'aiWriter' },
      { label: 'Code Helper', icon: CodeHelper, onClick: () => setView('codeHelper'), isActive: activeView === 'codeHelper' },
      { label: 'Voice Journal', icon: VoiceJournal, onClick: () => setView('voiceJournal'), isActive: activeView === 'voiceJournal' },
    ];

    return (
        <nav className="desktop-sidebar">
            <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
                <Logo persona={persona} />
                <div>
                    <h2 className="font-semibold text-white">{currentUser?.name || 'Guest'}</h2>
                    <p className="text-xs text-gray-400">{currentUser?.phone}</p>
                </div>
            </div>
            
            <SidebarClock />
            
            <div className="flex-1 overflow-y-auto">
                <h3 className="text-xs text-gray-500 font-semibold tracking-widest mb-2">APPLICATIONS</h3>
                <div className="sidebar-app-grid">
                    {apps.map(app => (
                        <AppButton
                            key={app.label}
                            label={app.label}
                            icon={app.icon}
                            isActive={app.isActive}
                            onClick={app.onClick}
                            disabled={isCallActive}
                        />
                    ))}
                </div>
            </div>

            <div className="flex-shrink-0 space-y-2">
                <AppButton
                    label="Settings"
                    icon={SettingsIcon}
                    isActive={activeView === 'settings'}
                    onClick={() => setView('settings')}
                    disabled={isCallActive}
                />
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 p-3 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </nav>
    );
};


// --- UTILITY FUNCTIONS ---

const initializeChatSessions = (): Record<AiMode, Message[]> => {
    const sessions = {} as Record<AiMode, Message[]>;
    for (const mode of AI_MODES) {
        sessions[mode.mode] = [];
    }
    return sessions;
};

const urlSafeBtoA = (str: string) => {
    return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const urlSafeAtoB = (str: string) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    } catch (e) {
        console.error("Failed to decode base64 string", e);
        return '';
    }
};

const safeJsonParse = <T,>(jsonString: string | null, defaultValue: T): T => {
    if (!jsonString) return defaultValue;
    try {
        return JSON.parse(jsonString) as T;
    } catch (e) {
        console.warn('Could not parse stored JSON, falling back to default.', { content: jsonString, error: e });
        return defaultValue;
    }
};

const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.error(`Failed to save to localStorage (key: ${key}):`, e);
    }
};

const safeRemoveItem = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error(`Failed to remove from localStorage (key: ${key}):`, e);
    }
};

// --- MAIN UI CONTENT ---

const KwararruAppUI: React.FC<any> = (props) => {
    const {
        currentUser, isSubscribed, logout, updateCurrentUser,
        persona, settings, chatSessions, callHistory,
        view, setView, replyingTo, setReplyingTo,
        selectedImage, setSelectedImage, selectedDocument, setSelectedDocument,
        selectedDataFile, setSelectedDataFile, resumeContent, setResumeContent,
        toastMessage, setToastMessage, showStatsModal, setShowStatsModal,
        showKeyboardShortcuts, setShowKeyboardShortcuts,
        aiMode, setAiMode, isAIGuessing, proactiveSuggestion, setProactiveSuggestion,
        proactiveAction, setProactiveAction, whiteboardElements, setWhiteboardElements,
        searchQuery, setSearchQuery, searchFilter, setSearchFilter,
        language, setLanguage,
        studyHubItems, studyProgress, calendarEvents,
        proactiveCalendarSuggestion, setProactiveCalendarSuggestion,
        showSubscriptionModal, setShowSubscriptionModal, isFirstVisit,
        workflows, isWorkflowEditorOpen, workflowToEdit,
        sessionNewsHistory, isGeneratingRadio, 
        radioHeadlines, setRadioHeadlines, tickerHeadlines,
        activeQuiz, setActiveQuiz, handleQuizComplete,
        activeDebate, setActiveDebate, handleDebateComplete,
        textInputRef, isDesktop, isPlayingAudio, playingTTSMessageId,
        handleShareSession, handleOnboardingComplete, updateSettings, 
        handleSetPersona,
        handleSetAiMode, clearChat, exportChat, handleImageSelect, handleDocumentSelect,
        handleDataFileSelect, handleResumeSelect, handleJumpToMessageContext,
        handleShareMessage, removeStudyHubItem, handleAddCalendarEvent,
        handleDeleteCalendarEvent, deleteMessage, starMessage, addReaction,
        copyMessage, playAudioMessage, playTTSMessage, handleUpdateFlashcardSRS,
        handleOpenWorkflowEditor, handleCloseWorkflowEditor, handleSaveWorkflow,
        handleDeleteWorkflow, handleToggleWorkflow, handleRunWorkflow,
        messages,
        setChatSessions,
        setStudyHubItems,
        setStudyProgress,
        setCalendarEvents,
        inputText,
        setInputText,
        isMeetingSetupVisible,
        setIsMeetingSetupVisible,
        setIsGeneratingRadio,
        radioLocation,
        setRadioLocation,
        radioCategory,
        setRadioCategory,
        isAssistantMinimized,
        setIsAssistantMinimized,
        assistantMessages,
        handleSendAssistantMessage,
        isCalendarFormOpen,
        setIsCalendarFormOpen
    } = props;

    // CONTEXT-DEPENDENT LOGIC
    const liveAPIContext = useLiveAPIContext();
    const { callState, startCall, pauseCall, resumeCall, endCall, broadcastIndex } = liveAPIContext;

    const { sendMessage, announceModeChange, handleAnalyzeSynergy, handleStartInterview, handleDraftCoverLetter } = useMessageHandling(
      isSubscribed,
      persona, settings, aiMode, setChatSessions, liveAPIContext.setIsTyping, setToastMessage, playTTSMessage,
      setProactiveSuggestion, setProactiveAction, setWhiteboardElements,
      liveAPIContext.callState, (script, text, systemInstruction, chatContext) => startCall(script, text, systemInstruction, chatContext), messages, resumeContent,
      setStudyHubItems, setStudyProgress, setCalendarEvents, workflows, handleRunWorkflow,
      setRadioHeadlines as any, () => {}, sessionNewsHistory, setAiMode, setActiveQuiz, setActiveDebate
    );

    const prevAiMode = useRef<AiMode | null>(null);

    useEffect(() => {
        if (prevAiMode.current && prevAiMode.current !== aiMode && view === 'chat') {
            announceModeChange(aiMode, prevAiMode.current);
        }
        prevAiMode.current = aiMode;
    }, [aiMode, view, announceModeChange]);
    
    const handleBroadcastControl = async (action: 'play-pause-resume' | 'stop', options?: { location: string; category: string }) => {
        if (action === 'stop') {
            endCall('idle');
            return;
        }
    
        if (callState === 'connected') {
            pauseCall();
        } else if (callState === 'paused') {
            resumeCall();
        } else if ((callState === 'idle' || callState === 'standby') && options) {
            // Always generate a new script when play is pressed from an idle state
            setIsGeneratingRadio(true);
            setRadioHeadlines([]); // Clear old headlines
            try {
                const prompt = `Generate a concise daily news briefing summarizing top news for ${options.location} in the ${options.category} category.`;
                const script = await generateNewsScript(prompt);
                if (script) {
                    const scriptWithAudio = await Promise.all(script.map(async (segment) => {
                        const voice = segment.persona === 'Agent Zara' ? VOICE_NAMES.AGENT_ZARA_DEFAULT : VOICE_NAMES.AGENT_ZERO_DEFAULT;
                        const audio = await generateSpeech(segment.text, voice as string);
                        return { ...segment, audio };
                    }));
                    setRadioHeadlines(scriptWithAudio);
                    startCall(scriptWithAudio);
                } else {
                    setToastMessage("Could not generate a news briefing at this time.");
                }
            } catch (e) {
                console.error("Failed to generate and play briefing:", e)
                setToastMessage("Failed to generate news briefing.");
            } finally {
                setIsGeneratingRadio(false);
            }
        }
    };

    const handleSuggestionClick = useCallback((prompt: string) => {
        sendMessage(prompt, null, null, null, null, false);
    }, [sendMessage]);

    const handleMessageAction = (action: 'summarize' | 'explain' | 'eli5' | 'teach-back', text: string) => {
        let prompt = '';
        if (action === 'summarize') {
            prompt = `Please provide a concise summary of the following text:\n\n---\n${text}\n---`;
        } else if (action === 'explain') {
            prompt = `Please explain the following text in a different way, as if for a beginner:\n\n---\n${text}\n---`;
        } else if (action === 'eli5') {
            prompt = `Explain the following text like I'm 5 years old:\n\n---\n${text}\n\n---`;
        } else if (action === 'teach-back') {
            prompt = `(SYSTEM: The user wants to try the 'Teach Back' method. Your role is now to act as a student. The user will explain the following concept to you. Your task is to listen to their explanation, then provide constructive feedback, ask clarifying questions, and point out any inaccuracies.)\n\n---CONCEPT---\n${text}\n\n(Start your response by inviting the user to explain the concept to you, for example: "Okay, I'm ready to learn. Please explain that concept to me as if I'm new to the topic.")`
        }
        sendMessage(prompt, null, null, null, null, false);
    };

    const handleAcceptProactiveSuggestion = useCallback(() => {
        if (proactiveSuggestion) {
            setAiMode(proactiveSuggestion.targetMode);
            sendMessage(proactiveSuggestion.initialPrompt, null, null, null, null, true);
            setProactiveSuggestion(null);
        }
    }, [proactiveSuggestion, setAiMode, sendMessage, setProactiveSuggestion]);

    const handleDismissProactiveSuggestion = useCallback(() => setProactiveSuggestion(null), [setProactiveSuggestion]);

    const handleAcceptProactiveAction = useCallback(() => {
        if (proactiveAction) {
            handleSetAiMode(proactiveAction.targetMode);
            setChatSessions(prev => ({
                ...prev,
                [proactiveAction.targetMode]: [...(prev[proactiveAction.targetMode] || []), proactiveAction.generatedContent]
            }));
            setProactiveAction(null);
        }
    }, [proactiveAction, handleSetAiMode, setChatSessions, setProactiveAction]);

    const handleDismissProactiveAction = useCallback(() => {
        setProactiveAction(null);
    }, [setProactiveAction]);

    const handleAcceptCalendarSuggestion = useCallback(() => {
        if (proactiveCalendarSuggestion) {
            sendMessage(proactiveCalendarSuggestion.suggestionText, null, null, null, null, false);
            setProactiveCalendarSuggestion(null);
        }
    }, [proactiveCalendarSuggestion, sendMessage, setProactiveCalendarSuggestion]);

    const handleDismissCalendarSuggestion = useCallback(() => {
        setProactiveCalendarSuggestion(null);
    }, [setProactiveCalendarSuggestion]);

    const onCallEndWithData = useCallback((polishedTranscript: string, englishTranscript: string, speakerNames: Record<string, string>) => {
        if (aiMode === 'meeting' && polishedTranscript.trim()) {
            sendMessage(`Please generate a meeting report.`, null, null, null, null, messages.length === 0, speakerNames, { polished: polishedTranscript, english: englishTranscript });
        } else if (aiMode === 'meeting') {
            setToastMessage("Meeting ended. Not enough conversation to generate a report.");
        }
    }, [aiMode, sendMessage, messages, setToastMessage]);

    useEffect(() => {
        liveAPIContext.setOnCallEndWithData(() => onCallEndWithData);
    }, [onCallEndWithData, liveAPIContext]);
    
    const chatUIProps = {view, isDesktop, messages, settings, isTyping: liveAPIContext.isTyping, searchQuery, searchFilter, setReplyingTo, deleteMessage, starMessage, addReaction, copyMessage, playAudioMessage, isPlayingAudio, playTTSMessage, playingTTSMessageId, setToastMessage, textInputRef, setAiMode: handleSetAiMode, persona, aiMode, handleSuggestionClick, handleShareMessage, handleJumpToMessageContext, handleMessageAction, resumeContent, handleAnalyzeSynergy, handleStartInterview, handleDraftCoverLetter, handleUpdateFlashcardSRS, startAudioReview: liveAPIContext.startFlashcardAudioReview, inputText, setInputText, handleSendMessage: (text: string, img: any, doc: any, reply: Message | null) => sendMessage(text, img, doc, selectedDataFile, reply, messages.length === 0), replyingTo,  selectedImage, setSelectedImage,  selectedDocument, proactiveSuggestion, onAcceptSuggestion: handleAcceptProactiveSuggestion, onDismissSuggestion: handleDismissProactiveSuggestion, setView, handleImageSelect, setSelectedDocument, handleDocumentSelect, isAIGuessing, handleGuessResponse: () => {}, cancelPrediction: () => {}, setResumeContent, handleResumeSelect, proactiveCalendarSuggestion, onAcceptCalendarSuggestion: handleAcceptCalendarSuggestion, onDismissCalendarSuggestion: handleDismissCalendarSuggestion, selectedDataFile, setSelectedDataFile, handleDataFileSelect, handleSetPersona };

    const renderAppContent = (currentView: View) => {
        switch(currentView) {
            case 'chat':
                if (aiMode === 'news' && !searchQuery) return <div className="broadcast-console-container"><LiveRadioPlayer {...{headlines: radioHeadlines, onPlaybackControl: handleBroadcastControl, isGeneratingRadio, currentIndex: broadcastIndex, location: radioLocation, setLocation: setRadioLocation, category: radioCategory, setCategory: setRadioCategory}}/></div>;
                if (aiMode === 'quiz' && !searchQuery) return <QuizShowUI {...{quiz: activeQuiz, isDesktop, onQuizComplete: handleQuizComplete, onStartQuiz: (topic: string) => sendMessage(topic, null, null, null, null, false)}} />;
                if (aiMode === 'debate' && !searchQuery) return <DebateStageUI {...{debate: activeDebate, isDesktop, onStartDebate: (topic: string) => sendMessage(topic, null, null, null, null, false), onDebateComplete: handleDebateComplete}} />;
                if (aiMode === 'translator' && !searchQuery) return <TranslatorConsole messages={messages} />;
                if (aiMode === 'default' && whiteboardElements.length > 0 && !searchQuery) return <WhiteboardView {...{messages, whiteboardElements, onUserDraw: (el) => setWhiteboardElements(prev => [...prev, el]), onClear: () => { if (window.confirm("Clear whiteboard?")) { setWhiteboardElements([]); } }, persona}}/>;
                return <ChatUI {...chatUIProps} />;
            case 'settings':
                return <SettingsScreen {...{currentUser, logout, persona, settings, callHistory, updateSettings, clearChat, exportChat, setView, setShowStatsModal, setShowKeyboardShortcuts, togglePersona: () => handleSetPersona(persona === 'Agent Zero' ? 'Agent Zara' : 'Agent Zero'), isDesktop, onBack: () => setView('dashboard'), workflows, onOpenWorkflowEditor: handleOpenWorkflowEditor, onDeleteWorkflow: handleDeleteWorkflow, onRunWorkflow: handleRunWorkflow, onToggleWorkflow: handleToggleWorkflow, setShowSubscriptionModal}} />;
            case 'studyHub':
                return <StudyHubScreen {...{items: studyHubItems, onRemove: removeStudyHubItem, setView, studyProgress}} />;
            case 'calendar':
                return <CalendarScreen {...{events: calendarEvents, onAddEvent: handleAddCalendarEvent, onDeleteEvent: handleDeleteCalendarEvent, setView, setIsFormOpen: setIsCalendarFormOpen}} />;
            case 'appDrawer':
                return <AppDrawer {...{setView, setAiMode}} />;
            case 'aiWriter':
                return <AIWritingAssistant />;
            case 'codeHelper':
                return <CodeHelper />;
            case 'voiceJournal':
                return <VoiceJournal />;
            case 'dashboard':
                 return <DashboardScreen isDesktop={isDesktop} setView={setView} setAiMode={handleSetAiMode} persona={persona} setPersona={handleSetPersona} />
            default:
                return null;
        }
    };
    
    const activeAppInfo = useMemo(() => {
        let name = '', iconComponent: React.ElementType | null = null;

        if (view === 'chat') {
            const modeInfo = AI_MODES.find(m => m.mode === aiMode);
            name = modeInfo?.name || 'Chat';
            iconComponent = modeInfo?.iconComponent || Globe;
        } else {
            const otherViews: Record<string, {name: string, iconComponent: React.ElementType}> = {
                settings: { name: 'Settings', iconComponent: SettingsIcon },
                studyHub: { name: 'Study Hub', iconComponent: BookOpen },
                calendar: { name: 'Calendar', iconComponent: Calendar },
                aiWriter: { name: 'AI Writer', iconComponent: AIWritingAssistant },
                codeHelper: { name: 'Code Helper', iconComponent: CodeHelper },
                voiceJournal: { name: 'Voice Journal', iconComponent: VoiceJournal },
            };
            if(otherViews[view]) {
              name = otherViews[view].name;
              iconComponent = otherViews[view].iconComponent;
            }
        }
        return { name, iconComponent };

    }, [view, aiMode]);

    const stats = useMemo(() => {
        const allMessages = Object.values(chatSessions).flat() as Message[];
        return {
            totalMessages: allMessages.length,
            userMessages: allMessages.filter(m => m.sender === 'user').length,
            botMessages: allMessages.filter(m => m.sender === 'bot').length,
            imageMessages: allMessages.filter(m => !!m.image).length,
            voiceMessages: allMessages.filter(m => !!m.audio).length,
            starredMessages: allMessages.filter(m => !!m.starred).length,
        };
    }, [chatSessions]);


    if (isDesktop) {
        return (
            <div className="h-screen w-full flex flex-col overflow-hidden text-[var(--text-primary)]">
                <DeepSpaceBackground aiMode={view === 'studyHub' ? 'study' : aiMode} />
                <div className="flex flex-1 min-h-0">
                    <Sidebar 
                        currentUser={currentUser} 
                        logout={logout}
                        activeView={view} 
                        setView={setView} 
                        activeMode={aiMode}
                        setAiMode={handleSetAiMode}
                        persona={persona} 
                        callState={callState}
                    />
                    <main className="app-main-content">
                        {view !== 'dashboard' && view !== 'appDrawer' && activeAppInfo.name ? (
                            <div className="flex flex-col h-full">
                                <header className="app-header">
                                    <div className="flex items-center gap-2">
                                        {activeAppInfo.iconComponent && <activeAppInfo.iconComponent size={18} />}
                                        <span>{activeAppInfo.name}</span>
                                    </div>
                                    <button onClick={() => setView('dashboard')} className="p-1 hover:bg-red-500/50 rounded-sm" title="Close App">
                                        <X size={16} />
                                    </button>
                                </header>
                                <div className="flex-1 overflow-y-auto relative">
                                    {renderAppContent(view)}
                                </div>
                            </div>
                        ) : (
                            renderAppContent('dashboard')
                        )}
                    </main>
                </div>
                
                <Taskbar persona={persona} />

                {toastMessage && (
                    <div className="absolute top-5 right-4 bg-black/70 backdrop-blur-sm border border-cyan-500/50 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-[100]">
                    {toastMessage}
                    </div>
                )}
                {showStatsModal && <StatsModal stats={stats} callHistory={callHistory} onClose={() => setShowStatsModal(false)} />}
                {showKeyboardShortcuts && <KeyboardShortcutsModal onClose={() => setShowKeyboardShortcuts(false)} />}
                {isMeetingSetupVisible && <MeetingSetupModal isOpen={isMeetingSetupVisible} onClose={() => setIsMeetingSetupVisible(false)} />}
                {proactiveAction && ( <ProactiveActionModal action={proactiveAction} onAccept={handleAcceptProactiveAction} onDismiss={handleDismissProactiveAction} /> )}
            </div>
        )
    }

    // MOBILE RENDER LOGIC
    return (
        <div className="h-screen w-full flex flex-col overflow-hidden text-[var(--text-primary)]">
            <DeepSpaceBackground aiMode={view === 'studyHub' ? 'study' : aiMode} />
            
            <main className="flex-1 min-h-0 relative flex flex-col">
                {view === 'dashboard' ? (
                     <DashboardScreen isDesktop={isDesktop} setView={setView} setAiMode={handleSetAiMode} persona={persona} setPersona={handleSetPersona} />
                ) : view === 'appDrawer' ? (
                    <AppDrawer setView={setView} setAiMode={setAiMode} />
                ) : (
                    <div className="mobile-app-layout">
                        <header className="mobile-app-header">
                            <button onClick={() => setView('dashboard')} className="p-1" aria-label="Go back to dashboard">
                                <ArrowLeft size={24} />
                            </button>
                            <h1 className="font-semibold text-lg">{activeAppInfo?.name}</h1>
                            <div className="w-8" />
                        </header>
                        <div className="mobile-feature-pod">
                            {view === 'calendar' ? (
                                <button onClick={() => setIsCalendarFormOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700">
                                    <Plus size={16} /> Add Event
                                </button>
                            ) : view === 'studyHub' ? (
                                <ProgressTracker progress={studyProgress} />
                            ) : (
                                <AgentPresence
                                    view={view}
                                    aiMode={aiMode}
                                    persona={persona}
                                    setPersona={handleSetPersona}
                                    isDesktop={false}
                                />
                            )}
                        </div>
                        <div className="mobile-app-content">
                            {renderAppContent(view)}
                        </div>
                    </div>
                )}
            </main>
            
            {view !== 'appDrawer' && <MobileFooter setView={setView} setAiMode={setAiMode} view={view} />}

            <EventFormModal isOpen={isCalendarFormOpen} onClose={() => setIsCalendarFormOpen(false)} onAddEvent={handleAddCalendarEvent} />
            
            {toastMessage && ( <div className="absolute top-5 right-4 ...">{toastMessage}</div> )}
            {showStatsModal && <StatsModal stats={stats} callHistory={callHistory} onClose={() => setShowStatsModal(false)} />}
            {showKeyboardShortcuts && <KeyboardShortcutsModal onClose={() => setShowKeyboardShortcuts(false)} />}
            {isMeetingSetupVisible && <MeetingSetupModal isOpen={isMeetingSetupVisible} onClose={() => setIsMeetingSetupVisible(false)} />}
            {proactiveAction && <ProactiveActionModal action={proactiveAction} onAccept={handleAcceptProactiveAction} onDismiss={handleDismissProactiveAction} />}
        </div>
    );
};


const KwararruApp: React.FC<{
    initialState: SharedSessionState | null;
    currentUser: UserProfile;
    isSubscribed: boolean;
    logout: () => void;
    updateCurrentUser: (updates: Partial<UserProfile>) => void;
}> = ({ initialState, currentUser, isSubscribed, logout, updateCurrentUser }) => {
    const [persona, setPersona] = useState<Persona>(initialState?.persona || 'Agent Zero');
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [chatSessions, setChatSessions] = useState<Record<AiMode, Message[]>>(() => initialState?.chatSessions || initializeChatSessions());
    const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
    const [view, setView] = useState<View>('dashboard');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string, preview: string } | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<{ name: string; content: string; type: string } | null>(null);
    const [selectedDataFile, setSelectedDataFile] = useState<DataFileContent | null>(null);
    const [resumeContent, setResumeContent] = useState<{ name: string, content: string } | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
    const [aiMode, setAiMode] = useState<AiMode>(initialState?.aiMode || 'default');
    const [isAIGuessing, setIsAIGuessing] = useState(false);
    const [proactiveSuggestion, setProactiveSuggestion] = useState<ProactiveSuggestion | null>(null);
    const [proactiveAction, setProactiveAction] = useState<ProactiveAction | null>(null);
    const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>(initialState?.whiteboardElements || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState<SearchFilterType>('all');
    const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
    const [isMeetingSetupVisible, setIsMeetingSetupVisible] = useState(false);
    const [language, setLanguage] = useState('English');
    const [studyHubItems, setStudyHubItems] = useState<StudyHubItem[]>([]);
    const [studyProgress, setStudyProgress] = useState<StudyProgress>({ studyDays: [], totalItems: 0 });
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [proactiveCalendarSuggestion, setProactiveCalendarSuggestion] = useState<ProactiveCalendarSuggestionContent | null>(null);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [isFirstVisit, setIsFirstVisit] = useState(false);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isWorkflowEditorOpen, setIsWorkflowEditorOpen] = useState(false);
    const [workflowToEdit, setWorkflowToEdit] = useState<Workflow | undefined>(undefined);
    const [sessionNewsHistory, setSessionNewsHistory] = useState<NewsArticle[]>([]);

    const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);
    const [radioHeadlines, setRadioHeadlines] = useState<{ persona: Persona; text: string; audio?: string | null }[]>([]);
    const [tickerHeadlines, setTickerHeadlines] = useState<string[]>([]);
    const [activeQuiz, setActiveQuiz] = useState<QuizContent | null>(null);
    const [activeDebate, setActiveDebate] = useState<DebateContent | null>(null);
    const [radioLocation, setRadioLocation] = useState('Nigeria');
    const [radioCategory, setRadioCategory] = useState('General');
    const [isCalendarFormOpen, setIsCalendarFormOpen] = useState(false);

    const textInputRef = useRef<HTMLInputElement>(null);
    const [inputText, setInputText] = useState('');
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

    const [isPlayingAudio, setIsPlayingAudio] = useState<number | null>(null);
    const [playingTTSMessageId, setPlayingTTSMessageId] = useState<number | null>(null);
    
    const [isAssistantMinimized, setIsAssistantMinimized] = useState(true);
    const [assistantMessages, setAssistantMessages] = useState<Message[]>([
        {
            id: Date.now(),
            text: "Welcome to Webzero! I'm your system assistant. How can I help you navigate the application today? For example, you can ask 'How do I check the news?' or 'How can I practice for a test?'.",
            sender: 'bot',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            status: 'read',
        }
    ]);

    const addMessageToChat = useCallback((message: Message, mode: AiMode = aiMode) => {
        setChatSessions(prev => ({
            ...prev,
            [mode]: [...(prev[mode] || []), message]
        }));
    }, [aiMode]);

    const handleSendAssistantMessage = async (text: string) => {
        const userMsg: Message = {
            id: Date.now(),
            text: text,
            sender: 'user',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            status: 'read',
        };
        setAssistantMessages(prev => [...prev, userMsg]);

        const botResponseText = await getAssistantResponse(text);
        
        const botMsg: Message = {
            id: Date.now() + 1,
            text: botResponseText,
            sender: 'bot',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            status: 'read',
        };
        setAssistantMessages(prev => [...prev, botMsg]);
    };
    
    const appendMessageText = useCallback((messageId: number, textChunk: string) => {
        setChatSessions(prevSessions => {
            const targetSession = prevSessions[aiMode];
            if (!targetSession) return prevSessions;
    
            const messageIndex = targetSession.findIndex(m => m.id === messageId);
            if (messageIndex === -1) return prevSessions;
    
            const updatedMessage = {
                ...targetSession[messageIndex],
                text: (targetSession[messageIndex].text || '') + textChunk,
            };
    
            const newTargetSession = [...targetSession];
            newTargetSession[messageIndex] = updatedMessage;
    
            return {
                ...prevSessions,
                [aiMode]: newTargetSession,
            };
        });
    }, [aiMode]);

    useEffect(() => {
        if (!isSubscribed) {
            setShowSubscriptionModal(true);
        } else {
            setShowSubscriptionModal(false);
        }
    }, [isSubscribed]);

    useEffect(() => {
        getLatestHeadlines().then(headlines => {
            if (headlines) {
                setTickerHeadlines(headlines);
            }
        });
    }, []);

    const updateFreeUsage = useCallback((seconds: number) => {
        if (!currentUser || currentUser.subscription.plan !== 'free') return;
        
        const today = new Date().toISOString().split('T')[0];
        let currentUsage = currentUser.subscription.freeMinutesUsedToday || 0;
        let lastUsed = currentUser.subscription.lastUsedDate;

        if (lastUsed !== today) {
            currentUsage = 0;
            lastUsed = today;
        }

        const newUsage = currentUsage + seconds;

        updateCurrentUser({
            subscription: {
                ...currentUser.subscription,
                freeMinutesUsedToday: newUsage,
                lastUsedDate: lastUsed
            }
        });
    }, [currentUser, updateCurrentUser]);

    const updateMessageText = (id: number, newText: string) => {
        setChatSessions(prev => {
            const newSessions = { ...prev };
            for (const mode in newSessions) {
                const session = newSessions[mode as AiMode];
                const messageIndex = session.findIndex(m => m.id === id);
                if (messageIndex > -1) {
                    const newMessages = [...session];
                    newMessages[messageIndex] = { ...newMessages[messageIndex], text: newText };
                    newSessions[mode as AiMode] = newMessages;
                    break;
                }
            }
            return newSessions;
        });
    };

    const handleShareSession = () => {
        try {
            const sessionState: SharedSessionState = { chatSessions, whiteboardElements, aiMode, persona };
            const encodedState = urlSafeBtoA(JSON.stringify(sessionState));
            const url = `${window.location.origin}${window.location.pathname}?session=${encodedState}`;
            navigator.clipboard.writeText(url);
            setToastMessage('Nexus Mode: Session share link copied to clipboard!');
        } catch(e) {
            console.error("Failed to create session share link:", e);
            setToastMessage('Could not create session share link.');
        }
    };
    
    const handleOnboardingComplete = () => {
        setIsFirstVisit(false);
        safeSetItem('kwararru_has_visited', 'true');
    };
    
    useEffect(() => {
        if (initialState) return; 

        try {
            const hasVisited = localStorage.getItem('kwararru_has_visited');
            if (!hasVisited) setIsFirstVisit(true);

            const savedSettings = localStorage.getItem('kwararru_settings');
            setSettings(safeJsonParse(savedSettings, DEFAULT_SETTINGS));

            const savedPersona = localStorage.getItem('kwararru_persona') as Persona;
            if (savedPersona) setPersona(savedPersona);
            
            const savedCallHistory = localStorage.getItem('kwararru_call_history');
            setCallHistory(safeJsonParse(savedCallHistory, []));
            const savedStudyHub = localStorage.getItem('kwararru_study_hub');
            setStudyHubItems(safeJsonParse(savedStudyHub, []));
            const savedStudyProgress = localStorage.getItem('kwararru_study_progress');
            setStudyProgress(safeJsonParse(savedStudyProgress, { studyDays: [], totalItems: 0 }));
            getUpcomingEvents().then(setCalendarEvents);
            const savedResume = localStorage.getItem('kwararru_resume');
            setResumeContent(safeJsonParse(savedResume, null));
            const savedWorkflows = localStorage.getItem('kwararru_workflows');
            setWorkflows(safeJsonParse(savedWorkflows, []));
        } catch (e) {
            console.error("Failed to access localStorage during initialization:", e);
            setToastMessage("Could not load saved data. Your browser may be blocking storage access.");
        }
    }, [initialState]);

    useEffect(() => {
        if (initialState) return;

        if (currentUser) {
            const savedHistory = localStorage.getItem(`kwararru_history_${currentUser.phone}`);
            const parsedHistory = safeJsonParse(savedHistory, {});
            AI_MODES.forEach(mode => { if (!parsedHistory[mode.mode]) { parsedHistory[mode.mode] = []; } });
            setChatSessions(parsedHistory);
        } else {
            setChatSessions(initializeChatSessions());
        }
    }, [initialState, currentUser]);
    
    useEffect(() => {
        const checkEvents = async () => {
            try {
                const now = Date.now();
                const upcomingEvent = calendarEvents.find(event => 
                    event.startTime > now && (event.startTime - now) < (30 * 60 * 1000)
                );
    
                if (upcomingEvent && !proactiveSuggestion && !proactiveCalendarSuggestion) {
                    const suggestion = await generateCalendarSuggestion(upcomingEvent);
                    setProactiveCalendarSuggestion(suggestion);
                }
            } catch (error) { console.warn("Could not check calendar events:", error); }
        };
    
        const intervalId = setInterval(checkEvents, 5 * 60 * 1000);
        checkEvents();
    
        return () => clearInterval(intervalId);
    }, [proactiveSuggestion, proactiveCalendarSuggestion, calendarEvents]);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    useEffect(() => { safeSetItem('kwararru_settings', JSON.stringify(settings)); }, [settings]);
    useEffect(() => { if(currentUser) safeSetItem(`kwararru_history_${currentUser.phone}`, JSON.stringify(chatSessions)); }, [chatSessions, currentUser]);
    useEffect(() => { safeSetItem('kwararru_call_history', JSON.stringify(callHistory)); }, [callHistory]);
    useEffect(() => { safeSetItem('kwararru_study_hub', JSON.stringify(studyHubItems)); }, [studyHubItems]);
    useEffect(() => { safeSetItem('kwararru_study_progress', JSON.stringify(studyProgress)); }, [studyProgress]);
    useEffect(() => { safeSetItem('kwararru_workflows', JSON.stringify(workflows)); }, [workflows]);
    useEffect(() => { resumeContent ? safeSetItem('kwararru_resume', JSON.stringify(resumeContent)) : safeRemoveItem('kwararru_resume'); }, [resumeContent]);

    useEffect(() => {
        safeSetItem('kwararru_persona', persona);
    }, [persona]);
    
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const updateSettings = (key: keyof Settings, value: any) => setSettings(prev => ({ ...prev, [key]: value }));
    
    const handleSetPersona = useCallback((newPersona: Persona) => {
        if (newPersona !== persona) {
            setPersona(newPersona);
            const newVoice = newPersona === 'Agent Zara' ? VOICE_NAMES.AGENT_ZARA_DEFAULT : VOICE_NAMES.AGENT_ZERO_DEFAULT;
            updateSettings('voiceName', newVoice as any);
            audioManager.playSound('swoosh');
        }
    }, [persona]);

    const handleSetAiMode = useCallback((mode: AiMode) => {
        if (mode !== aiMode) {
            setAiMode(mode);
            setReplyingTo(null);
            setSelectedImage(null);
            setSelectedDocument(null);
            setActiveQuiz(null);
            setActiveDebate(null);
        }
    }, [aiMode]);

    const clearChat = () => {
        if (window.confirm('Are you sure you want to delete all messages in this mode?')) {
            setChatSessions(prev => ({ ...prev, [aiMode]: [] }));
            setToastMessage('Chat log purged.');
        }
    };

    const exportChat = () => {
        const data = JSON.stringify(chatSessions[aiMode], null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kwararru_log_${aiMode}_${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setToastMessage('Chat log exported.');
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = (reader.result as string).split(',')[1];
                const previewUrl = URL.createObjectURL(file);
                setSelectedImage({ data: base64data, mimeType: file.type, preview: previewUrl });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map((item: any) => item.str).join(' ');
                    }
                    setSelectedDocument({ name: file.name, content: text, type: file.type });
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
                    setSelectedDocument({ name: file.name, content: result.value, type: file.type });
                }
            };
            reader.readAsArrayBuffer(file);
        } else { // Plain text
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setSelectedDocument({ name: file.name, content: event.target.result as string, type: file.type });
                }
            };
            reader.readAsText(file);
        }
        e.target.value = ''; // Allow re-selecting the same file
    };

    const handleDataFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'text/csv') {
             const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setSelectedDataFile({ name: file.name, content: event.target.result as string });
                }
            };
            reader.readAsText(file);
        } else {
            setToastMessage("Please select a valid CSV file.");
        }
         e.target.value = '';
    };

    const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                 if (event.target?.result) {
                    setResumeContent({ name: file.name, content: event.target.result as string });
                    setToastMessage("Resume uploaded successfully.");
                }
            };
            reader.readAsText(file);
        }
         e.target.value = '';
    };

    const handleJumpToMessageContext = (mode: AiMode) => {
        setAiMode(mode);
        setView('chat');
        setSearchQuery('');
    };

    const handleShareMessage = (message: Message) => {
        try {
            const encodedMessage = urlSafeBtoA(JSON.stringify(message));
            const url = `${window.location.origin}${window.location.pathname}?content=${encodedMessage}`;
            navigator.clipboard.writeText(url);
            setToastMessage('Shareable content link copied to clipboard!');
        } catch(e) {
            console.error("Failed to create share link:", e);
            setToastMessage('Could not create share link.');
        }
    };

    const removeStudyHubItem = (id: string) => {
        setStudyHubItems(prev => prev.filter(item => item.id !== id));
        setToastMessage("Item removed from Study Hub.");
    };

    const handleAddCalendarEvent = async (event: Omit<CalendarEvent, 'id'>) => {
        try {
            const newEvent = await addCalendarEvent(event);
            setCalendarEvents(prev => [...prev, newEvent]);
            setToastMessage("Event added to calendar.");
            setIsCalendarFormOpen(false);
        } catch (e) {
            setToastMessage("Failed to add event.");
        }
    };
    const handleDeleteCalendarEvent = async (eventId: string) => {
        try {
            await deleteCalendarEvent(eventId);
            setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
            setToastMessage("Event removed from calendar.");
        } catch (e) {
            setToastMessage("Failed to remove event.");
        }
    };
    
    const deleteMessage = (id: number) => {
        setChatSessions(prev => {
            const newSession = [...prev[aiMode]];
            const msgIndex = newSession.findIndex(m => m.id === id);
            if (msgIndex !== -1) {
                newSession[msgIndex] = { ...newSession[msgIndex], isDeleting: true };
            }
            return { ...prev, [aiMode]: newSession };
        });

        setTimeout(() => {
            setChatSessions(prev => ({
                ...prev,
                [aiMode]: prev[aiMode].filter(m => m.id !== id),
            }));
        }, 500);
    };

    const starMessage = (id: number) => {
        setChatSessions(prev => ({
            ...prev,
            [aiMode]: prev[aiMode].map(m => m.id === id ? { ...m, starred: !m.starred } : m),
        }));
    };
    
    const addReaction = (id: number, emoji: string) => {
        setChatSessions(prev => ({
            ...prev,
            [aiMode]: prev[aiMode].map(m => {
                if (m.id !== id) return m;
                const reactions = [...(m.reactions || [])];
                const existingReaction = reactions.find(r => r.emoji === emoji);
                if (existingReaction) {
                    existingReaction.count += 1;
                } else {
                    reactions.push({ emoji, count: 1 });
                }
                return { ...m, reactions };
            }),
        }));
    };
    
    const copyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
        setToastMessage('Message copied to clipboard.');
    };

    const playAudioMessage = async (audioUrl: string, messageId: number) => {
        if (isPlayingAudio === messageId) {
            setIsPlayingAudio(null);
        } else {
            setIsPlayingAudio(messageId);
        }
    };
    
    const playTTSMessage = async (audioData: string, messageId: number) => {
        if (playingTTSMessageId === messageId) {
            audioManager.stopTTS();
            setPlayingTTSMessageId(null);
        } else {
            setPlayingTTSMessageId(messageId);
            await audioManager.playTTS(audioData);
            setPlayingTTSMessageId(null);
        }
    };

    const handleUpdateFlashcardSRS = (deckId: string, updatedCards: Flashcard[]) => {
        setStudyHubItems(prev => prev.map(item => {
            if (item.type === 'cards' && item.id === deckId) {
                return { ...item, flashcards: updatedCards };
            }
            return item;
        }));
    };

    const handleOpenWorkflowEditor = (workflow?: Workflow) => {
        setWorkflowToEdit(workflow);
        setIsWorkflowEditorOpen(true);
    };
    
    const handleCloseWorkflowEditor = () => {
        setIsWorkflowEditorOpen(false);
        setWorkflowToEdit(undefined);
    };

    const handleSaveWorkflow = (workflow: Workflow) => {
        setWorkflows(prev => {
            const index = prev.findIndex(w => w.id === workflow.id);
            if (index > -1) {
                const newWorkflows = [...prev];
                newWorkflows[index] = workflow;
                return newWorkflows;
            }
            return [...prev, workflow];
        });
        handleCloseWorkflowEditor();
    };

    const handleDeleteWorkflow = (workflowId: string) => {
        if(window.confirm("Are you sure you want to delete this workflow?")) {
            setWorkflows(prev => prev.filter(w => w.id !== workflowId));
        }
    };

    const handleToggleWorkflow = (workflowId: string, isEnabled: boolean) => {
        setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, isEnabled } : w));
    };

    const handleRunWorkflow = useCallback((workflowId: string) => {
        const workflow = workflows.find(w => w.id === workflowId);
        if (!workflow) {
            setToastMessage(`Error: Workflow not found.`);
            return;
        }
        setToastMessage(`Running workflow: ${workflow.name}...`);
        const firstStep = workflow.steps[0];
        if (firstStep && firstStep.type === 'get_news' && firstStep.params.topic) {
            handleSetAiMode('news');
            setView('chat');
            const { sendMessage } = useMessageHandling(isSubscribed, persona, settings, 'news', setChatSessions, () => {}, setToastMessage, playTTSMessage, setProactiveSuggestion, setProactiveAction, setWhiteboardElements, 'idle', () => {}, [], undefined);
            sendMessage(firstStep.params.topic as string, null, null, null, null, true);
        }
    }, [workflows, isSubscribed, persona, settings, setChatSessions, setToastMessage, playTTSMessage, setProactiveSuggestion, setProactiveAction, setWhiteboardElements, handleSetAiMode, setView]);
    
    const handleQuizComplete = (score: { correct: number, incorrect: number }) => {
        const total = score.correct + score.incorrect;
        const resultText = `Quiz finished! Your score: ${score.correct}/${total}.`;
        const systemMessage: Message = { id: Date.now(), text: resultText, sender: 'system', time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'}), timestamp: Date.now(), status: 'read' };
        addMessageToChat(systemMessage);
        setActiveQuiz(null); // Return to standard chat
    };
    
    const handleDebateComplete = () => {
        const systemMessage: Message = { id: Date.now(), text: "The debate has concluded.", sender: 'system', time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'}), timestamp: Date.now(), status: 'read' };
        addMessageToChat(systemMessage);
        setActiveDebate(null);
    };

    const appUIProps = {
        currentUser, isSubscribed, logout, updateCurrentUser,
        persona, settings, chatSessions, callHistory,
        view, setView, replyingTo, setReplyingTo,
        selectedImage, setSelectedImage, selectedDocument, setSelectedDocument,
        selectedDataFile, setSelectedDataFile, resumeContent, setResumeContent,
        toastMessage, setToastMessage, showStatsModal, setShowStatsModal,
        showKeyboardShortcuts, setShowKeyboardShortcuts,
        aiMode, setAiMode, isAIGuessing, proactiveSuggestion, setProactiveSuggestion,
        proactiveAction, setProactiveAction, whiteboardElements, setWhiteboardElements,
        searchQuery, setSearchQuery, searchFilter, setSearchFilter,
        language, setLanguage,
        studyHubItems, studyProgress, calendarEvents,
        proactiveCalendarSuggestion, setProactiveCalendarSuggestion,
        showSubscriptionModal, setShowSubscriptionModal, isFirstVisit,
        workflows, isWorkflowEditorOpen, workflowToEdit,
        sessionNewsHistory, isGeneratingRadio, 
        radioHeadlines, setRadioHeadlines, tickerHeadlines,
        activeQuiz, setActiveQuiz, handleQuizComplete,
        activeDebate, setActiveDebate, handleDebateComplete,
        textInputRef, isDesktop, isPlayingAudio, playingTTSMessageId,
        handleShareSession, handleOnboardingComplete, updateSettings, 
        handleSetPersona,
        handleSetAiMode, clearChat, exportChat, handleImageSelect, handleDocumentSelect,
        handleDataFileSelect, handleResumeSelect, handleJumpToMessageContext,
        handleShareMessage, removeStudyHubItem, handleAddCalendarEvent,
        handleDeleteCalendarEvent, deleteMessage, starMessage, addReaction,
        copyMessage, playAudioMessage, playTTSMessage, handleUpdateFlashcardSRS,
        handleOpenWorkflowEditor, handleCloseWorkflowEditor, handleSaveWorkflow,
        handleDeleteWorkflow, handleToggleWorkflow, handleRunWorkflow,
        messages: chatSessions[aiMode] || [],
        setChatSessions,
        setStudyHubItems,
        setStudyProgress,
        setCalendarEvents,
        inputText,
        setInputText,
        isMeetingSetupVisible,
        setIsMeetingSetupVisible,
        setIsGeneratingRadio,
        radioLocation,
        setRadioLocation,
        radioCategory,
        setRadioCategory,
        isAssistantMinimized,
        setIsAssistantMinimized,
        assistantMessages,
        handleSendAssistantMessage,
        isCalendarFormOpen,
        setIsCalendarFormOpen,
    };
    return <KwararruAppUI {...appUIProps} />;
};

export default function App() {
    const { currentUser, isSubscribed, isLoading, login, signup, logout, updateCurrentUser } = useAuth();
    const [initialState, setInitialState] = useState<SharedSessionState | null>(null);
    const [contentToShare, setContentToShare] = useState<Message | null>(null);

    useEffect(() => {
        audioManager.init();
        const urlParams = new URLSearchParams(window.location.search);
        const sessionParam = urlParams.get('session');
        const contentParam = urlParams.get('content');

        if (sessionParam) {
            try {
                const decodedState = JSON.parse(urlSafeAtoB(sessionParam));
                setInitialState(decodedState);
            } catch (e) {
                console.error("Failed to parse session state from URL", e);
            }
        }
        if (contentParam) {
             try {
                const decodedContent = JSON.parse(urlSafeAtoB(contentParam));
                setContentToShare(decodedContent);
            } catch (e) {
                console.error("Failed to parse shared content from URL", e);
            }
        }
    }, []);

    if (contentToShare) {
        return (
            <ErrorBoundary>
                <SharedContentViewer message={contentToShare} />
            </ErrorBoundary>
        )
    }

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <Loader size={48} className="animate-spin text-cyan-400" />
            </div>
        );
    }

    if (!currentUser) {
        return <LoginScreen onLogin={login} onSignup={signup} />;
    }
    
    // Admin override: check phone number for admin access
    if (currentUser.phone === '+2347010102053') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            return <AdminDashboard />;
        }
    }

    return (
        <ErrorBoundary>
            <LiveAPIProvider 
                currentUser={currentUser}
                subscriptionIsActive={isSubscribed}
                updateFreeUsage={(seconds) => updateCurrentUser({ ...currentUser, subscription: { ...currentUser.subscription, freeMinutesUsedToday: (currentUser.subscription.freeMinutesUsedToday || 0) + seconds } })}
                persona={'Agent Zero'}
                setPersona={() => {}}
                settings={DEFAULT_SETTINGS}
                aiMode={'default'}
                view={'chat'}
                setToastMessage={() => {}}
                setCallHistory={() => {}}
                onModeChangeByAI={() => {}}
                setAiMode={() => {}}
                switchToChatView={() => {}}
                addMessageToChat={() => {}}
                appendMessageText={() => {}}
                updateMessageText={() => {}}
                setView={() => {}}
                updateSettings={() => {}}
                clearChat={() => {}}
                exportChat={() => {}}
                speakerNames={{}}
                setSpeakerNames={() => {}}
                setShowMeetingModal={() => {}}
                language={'English'}
                sessionNewsHistory={[]}
                isMultiAgentMode={false}
                setWhiteboardElements={() => {}}
            >
                <KwararruApp 
                    initialState={initialState} 
                    currentUser={currentUser}
                    isSubscribed={isSubscribed}
                    logout={logout}
                    updateCurrentUser={updateCurrentUser}
                />
            </LiveAPIProvider>
        </ErrorBoundary>
    );
}