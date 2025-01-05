import React, { useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookingsContext } from '../contexts/BookingsContext';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../pages/DatePicker.css';
import { useNavigate } from 'react-router-dom';

// Helper function to format dates with the day of the week
const formatDateWithDay = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Form validation schema
const bookingSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z.string()
    .email('Invalid email address'),
  phone: z.string()
    .regex(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
  date: z.date()
    .refine(date => {
      const now = new Date('2025-01-05T00:38:35-06:00');
      return date >= new Date(now.setHours(0, 0, 0, 0));
    }, 'Date cannot be in the past'),
  time: z.string()
    .min(1, 'Please select a time'),
  guests: z.number()
    .min(1, 'At least 1 guest is required')
    .max(10, 'Maximum 10 guests allowed'),
  occasion: z.string()
    .optional(),
  seating: z.string()
    .optional(),
  specialRequests: z.string()
    .max(500, 'Special requests must be less than 500 characters')
    .optional(),
}).refine((data) => {
  if (!data.time || !data.date) return true;
  const now = new Date('2025-01-05T00:38:35-06:00');
  const [hours, minutes] = data.time.split(':');
  const selectedDateTime = new Date(data.date);
  selectedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return selectedDateTime > now;
}, {
  message: "Selected time has already passed",
  path: ["time"]
});

const occasions = [
  'Birthday', 'Anniversary', 'Date Night', 'Business Meal',
  'Family Gathering', 'Other',
];

const seatingOptions = [
  'Indoor', 'Outdoor', 'Bar', 'No Preference',
];

const BookingForm = ({ onSubmitSuccess, initialValues, onCancel, isEditing }) => {
  const navigate = useNavigate();
  const { getAvailableTimeSlots, addBooking } = useContext(BookingsContext);
  const [availableTimes, setAvailableTimes] = React.useState([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(null);
  
  // Add undo/redo state
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [lastUpdate, setLastUpdate] = useState(null);

  const defaultValues = useMemo(() => ({
    name: '',
    email: '',
    phone: '',
    date: new Date(),
    time: '',
    guests: 2,
    occasion: '',
    seating: 'no preference',
    specialRequests: ''
  }), []);

  const form = useForm({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: initialValues || defaultValues,
  });

  const { handleSubmit, formState: { errors }, setValue, watch } = form;
  
  const isUndoDisabled = currentIndex <= 0;
  const isRedoDisabled = currentIndex >= history.length - 1;

  const addToHistory = useCallback((values) => {
    const valuesToStore = { ...values };
    if (valuesToStore.date instanceof Date) {
      valuesToStore.date = valuesToStore.date.toISOString();
    }
    
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      return [...newHistory, valuesToStore];
    });
    setCurrentIndex(prev => prev + 1);
    setLastUpdate(Date.now());
  }, [currentIndex]);

  const handleUndo = useCallback(() => {
    if (!isUndoDisabled && history.length > 0) {
      const previousValues = history[currentIndex - 1];
      if (previousValues) {
        // Reset form to previous state
        Object.entries(previousValues).forEach(([field, value]) => {
          if (value !== undefined && value !== null) {
            if (field === 'date' && value) {
              setValue(field, new Date(value));
            } else {
              setValue(field, value);
            }
          }
        });
        setCurrentIndex(prev => prev - 1);
      }
    }
  }, [history, currentIndex, isUndoDisabled, setValue]);

  const handleRedo = useCallback(() => {
    if (!isRedoDisabled && history.length > 0) {
      const nextValues = history[currentIndex + 1];
      if (nextValues) {
        Object.entries(nextValues).forEach(([field, value]) => {
          if (value !== undefined && value !== null) {
            if (field === 'date' && value) {
              setValue(field, new Date(value));
            } else {
              setValue(field, value);
            }
          }
        });
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [history, currentIndex, isRedoDisabled, setValue]);

  // Watch for form changes with debouncing
  const watchAllFields = watch();
  useEffect(() => {
    // Prevent rapid updates
    const now = Date.now();
    if (lastUpdate && now - lastUpdate < 500) {
      return;
    }

    // Skip empty or default values
    const hasChanges = Object.entries(watchAllFields).some(([field, value]) => {
      if (value === undefined || value === null) return false;
      if (value === defaultValues[field]) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    });

    if (hasChanges) {
      const lastEntry = history[currentIndex];
      const currentValues = { ...watchAllFields };
      
      // Convert date for comparison
      if (currentValues.date instanceof Date) {
        currentValues.date = currentValues.date.toISOString();
      }

      // Only add if different from last entry
      if (!lastEntry || JSON.stringify(lastEntry) !== JSON.stringify(currentValues)) {
        addToHistory(watchAllFields);
      }
    }
  }, [watchAllFields, addToHistory, history, currentIndex, lastUpdate, defaultValues]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleUndo, handleRedo]);

  const selectedDate = watch('date');

  // Add form value watching for debugging
  const watchedValues = watch(['name', 'email', 'phone']);
  console.log('Watched form values:', watchedValues);

  const watchedStep2Values = watch(['date', 'time', 'guests']);
  console.log('Watched step 2 values:', watchedStep2Values);

  // Format time to 12-hour format
  const formatTime = useMemo(() => (time) => {
    if (!time) return '';
    if (time.includes('AM') || time.includes('PM')) {
      return time;
    }

    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }, []);

  const isStepValid = useCallback((step) => {
    const values = watch();
    console.log('Current form values:', values);
    
    // For step 1 (contact info)
    if (step === 0) {
      const { name, email, phone } = values;
      console.log('Step 1 fields:', { name, email, phone });
      return Boolean(name) && Boolean(email) && Boolean(phone);
    }
    
    // For step 2 (reservation details)
    if (step === 1) {
      const { date, time, guests } = values;
      const guestsNumber = Number(guests);
      
      console.log('Step 2 validation check:', {
        date: date instanceof Date ? date.toISOString() : date,
        time,
        guests,
        guestsNumber,
        dateType: typeof date,
        timeType: typeof time,
        guestsType: typeof guests
      });
      
      const isDateValid = date instanceof Date || (typeof date === 'string' && date.length > 0);
      const isTimeValid = typeof time === 'string' && time.length > 0;
      const isGuestsValid = !isNaN(guestsNumber) && guestsNumber >= 1 && guestsNumber <= 10;
      
      console.log('Step 2 field validation:', { isDateValid, isTimeValid, isGuestsValid });
      
      return isDateValid && isTimeValid && isGuestsValid;
    }
    
    // For step 3 (preferences)
    if (step === 2) {
      return true; // Preferences are optional
    }
    
    return false;
  }, [watch]);

  const handleNext = useCallback(() => {
    if (isStepValid(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  }, [isStepValid, activeStep]);

  const handleBack = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleFormSubmit = (data) => {
    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!formData) return;
    
    setShowConfirmation(false);
    setIsSubmitting(true);
    
    try {
      const success = await addBooking(formData);
      if (success) {
        if (isEditing) {
          onSubmitSuccess?.(formData);
        } else {
          onSubmitSuccess?.(formData);
          navigate('/booking-confirmed');
        }
      } else {
        throw new Error('Failed to add booking');
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterPastTimes = useCallback((times, selectedDate) => {
    const now = new Date('2025-01-05T00:37:12-06:00'); // Using the provided current time
    
    // If selected date is today, filter out past times
    if (selectedDate && selectedDate.toDateString() === now.toDateString()) {
      return times.filter(time => {
        const [hours, minutes] = time.split(':');
        const timeToCheck = new Date(selectedDate);
        timeToCheck.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return timeToCheck > now;
      });
    }
    
    return times;
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const fetchTimes = async () => {
      setIsSubmitting(true);
      try {
        const times = await getAvailableTimeSlots(selectedDate);
        if (isMounted) {
          const filteredTimes = filterPastTimes(times || [], selectedDate);
          setAvailableTimes(filteredTimes);
          // Set the first available time if no time is selected
          if (filteredTimes && filteredTimes.length > 0 && !watch('time')) {
            setValue('time', filteredTimes[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching times:', error);
      } finally {
        if (isMounted) {
          setIsSubmitting(false);
        }
      }
    };

    if (selectedDate) {
      fetchTimes();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedDate, getAvailableTimeSlots, setValue, watch, filterPastTimes]);

  const renderStepContent = useCallback((step) => {
    switch (step) {
      case 0:
        return (
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Contact Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  id="name-input"
                  label="Full Name"
                  fullWidth
                  {...form.register('name')}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  inputProps={{
                    'aria-label': 'Full Name',
                    'aria-describedby': errors.name ? 'name-error' : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  id="email-input"
                  label="Email"
                  fullWidth
                  type="email"
                  {...form.register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  inputProps={{
                    'aria-label': 'Email',
                    'aria-describedby': errors.email ? 'email-error' : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  id="phone-input"
                  label="Phone Number"
                  fullWidth
                  {...form.register('phone')}
                  error={!!errors.phone}
                  helperText={errors.phone?.message || 'Format: 1234567890'}
                  inputProps={{
                    'aria-label': 'Phone Number',
                    'aria-describedby': errors.phone ? 'phone-error' : undefined
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        );
        
      case 1:
        return (
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Reservation Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!errors.date}>
                  <DatePicker
                    selected={watch('date')}
                    onChange={(date) => setValue('date', date)}
                    minDate={new Date()}
                    dateFormat="EEEE, MM/dd/yyyy"
                    customInput={
                      <TextField
                        id="date-input"
                        fullWidth
                        label="Date"
                        error={!!errors.date}
                        helperText={errors.date?.message}
                        value={watch('date') ? formatDateWithDay(watch('date')) : ''}
                        inputProps={{
                          'aria-label': 'Date',
                          'aria-describedby': errors.date ? 'date-error' : undefined
                        }}
                      />
                    }
                  />
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!errors.time}>
                  <InputLabel id="time-label">Time</InputLabel>
                  <Select
                    labelId="time-label"
                    id="time-input"
                    label="Time"
                    value={watch('time') || ''}
                    {...form.register('time')}
                    error={!!errors.time}
                    inputProps={{
                      'aria-label': 'Time',
                      'aria-describedby': errors.time ? 'time-error' : undefined
                    }}
                  >
                    {availableTimes.map((time) => (
                      <MenuItem key={time} value={time}>
                        {formatTime(time)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.time && (
                    <FormHelperText error>{errors.time.message}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!errors.guests}>
                  <TextField
                    id="guests-input"
                    label="Number of guests"
                    type="number"
                    {...form.register('guests', {
                      valueAsNumber: true,
                      setValueAs: v => Number(v)
                    })}
                    error={!!errors.guests}
                    helperText={errors.guests?.message}
                    inputProps={{
                      min: 1,
                      max: 10,
                      'aria-label': 'Number of guests',
                      'aria-describedby': errors.guests ? 'guests-error' : undefined
                    }}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        );

      case 2:
        return (
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Preferences</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              All fields in this section are optional. Feel free to skip if you don't have any specific preferences.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.occasion}>
                  <InputLabel id="occasion-label">Occasion</InputLabel>
                  <Select
                    id="occasion-input"
                    {...form.register('occasion')}
                    labelId="occasion-label"
                    label="Occasion"
                    aria-label="Select occasion"
                    aria-invalid={!!errors.occasion}
                    aria-describedby={errors.occasion ? 'occasion-error' : undefined}
                  >
                    {occasions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.seating}>
                  <InputLabel id="seating-label">Seating Preference</InputLabel>
                  <Select
                    id="seating-input"
                    {...form.register('seating')}
                    labelId="seating-label"
                    label="Seating Preference"
                    aria-label="Select seating preference"
                    aria-invalid={!!errors.seating}
                    aria-describedby={errors.seating ? 'seating-error' : undefined}
                  >
                    {seatingOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.specialRequests}>
                  <TextField
                    id="special-requests-input"
                    label="Special Requests"
                    multiline
                    rows={4}
                    {...form.register('specialRequests')}
                    error={!!errors.specialRequests}
                    helperText={errors.specialRequests?.message}
                    inputProps={{
                      'aria-label': 'Special requests',
                      'aria-describedby': errors.specialRequests ? 'special-requests-error' : undefined
                    }}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        );
      default:
        return null;
    }
  }, [errors, form, availableTimes, formatTime, setValue, watch]);

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 0 }}>
            {isEditing ? 'Edit Booking' : 'Make a Reservation'}
          </Typography>
          <Box>
            <Tooltip title="Undo (Ctrl+Z)">
              <span>
                <IconButton 
                  onClick={handleUndo} 
                  disabled={isUndoDisabled}
                  size="small"
                >
                  <UndoIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Shift+Z)">
              <span>
                <IconButton 
                  onClick={handleRedo} 
                  disabled={isRedoDisabled}
                  size="small"
                >
                  <RedoIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <form onSubmit={(e) => {
          // Only submit if we're on the last step
          if (activeStep !== 2) {
            e.preventDefault();
            return;
          }
          handleSubmit(handleFormSubmit)(e);
        }} aria-label="Reservation form">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Stepper activeStep={activeStep} alternativeLabel>
                <Step>
                  <StepLabel>Contact Info</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Reservation Details</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Preferences (Optional)</StepLabel>
                </Step>
              </Stepper>
            </Grid>

            <Grid item xs={12}>
              {renderStepContent(activeStep)}
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Box>
                  {activeStep > 0 && (
                    <Button onClick={handleBack} sx={{ mr: 1 }}>
                      Back
                    </Button>
                  )}
                </Box>
                <Box>
                  {onCancel && (
                    <Button
                      onClick={onCancel}
                      variant="outlined"
                      aria-label="Cancel reservation"
                      sx={{ mr: 1 }}
                    >
                      Cancel
                    </Button>
                  )}
                  {activeStep === 2 ? (
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={!isStepValid(2) || isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : isEditing ? 'Update Booking' : 'Reserve Table'}
                    </Button>
                  ) : (
                    <div onClick={(e) => e.preventDefault()}>
                      <Button
                        type="button"
                        variant="contained"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNext();
                        }}
                        disabled={!isStepValid(activeStep)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </form>

        <Dialog
          open={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          aria-labelledby="confirmation-dialog-title"
        >
          <DialogTitle id="confirmation-dialog-title">
            Confirm Reservation
          </DialogTitle>
          <DialogContent>
            {formData && (
              <Box>
                <Typography variant="body1" paragraph>
                  Please confirm your reservation details:
                </Typography>
                <Typography><strong>Name:</strong> {formData.name}</Typography>
                <Typography><strong>Date:</strong> {formatDateWithDay(formData.date)}</Typography>
                <Typography><strong>Time:</strong> {formatTime(formData.time)}</Typography>
                <Typography><strong>Guests:</strong> {formData.guests}</Typography>
                <Typography><strong>Occasion:</strong> {formData.occasion}</Typography>
                <Typography><strong>Seating:</strong> {formData.seating}</Typography>
                <Typography><strong>Special Requests:</strong> {formData.specialRequests}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfirmation(false)}>
              Edit
            </Button>
            <Button onClick={handleConfirmSubmit} variant="contained" color="primary">
              Confirm Reservation
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default BookingForm;
