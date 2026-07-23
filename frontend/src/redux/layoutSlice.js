import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // adjust if needed, but relative url could also work if proxy is set, using relative for standard practice or relying on existing apiService structure. Let's use relative with standard withCredentials
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const fetchLayout = createAsyncThunk('layout/fetchLayout', async () => {
    const response = await api.get('/cms/layout');
    return response.data.data;
});

export const publishLayout = createAsyncThunk('layout/publishLayout', async (sections, { rejectWithValue }) => {
    try {
        const response = await api.put('/cms/layout', { sections });
        return response.data.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to publish layout');
    }
});

const layoutSlice = createSlice({
    name: 'layout',
    initialState: {
        sections: [],
        draftSections: [],
        status: 'idle',
        error: null,
    },
    reducers: {
        updateDraftSections: (state, action) => {
            state.draftSections = action.payload;
        },
        resetDraft: (state) => {
            state.draftSections = state.sections;
        },
        setDraftVisibility: (state, action) => {
            const { id, visible } = action.payload;
            const section = state.draftSections.find(s => s.id === id);
            if (section) section.visible = visible;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLayout.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchLayout.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.sections = action.payload.sections || [];
                state.draftSections = action.payload.sections || [];
            })
            .addCase(fetchLayout.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(publishLayout.fulfilled, (state, action) => {
                state.sections = action.payload.sections || [];
                state.draftSections = action.payload.sections || [];
            });
    }
});

export const { updateDraftSections, resetDraft, setDraftVisibility } = layoutSlice.actions;

export default layoutSlice.reducer;
