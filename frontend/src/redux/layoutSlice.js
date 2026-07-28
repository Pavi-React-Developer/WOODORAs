import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';

export const fetchLayout = createAsyncThunk('layout/fetchLayout', async () => {
    const response = await apiClient.get('/cms/layout');
    return response.data.data;
});

export const publishLayout = createAsyncThunk('layout/publishLayout', async (sections, { rejectWithValue }) => {
    try {
        const response = await apiClient.put('/cms/layout', { sections });
        return response.data.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || err.message || 'Failed to publish layout');
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
