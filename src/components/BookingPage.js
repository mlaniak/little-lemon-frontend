import React, { useState, useEffect } from 'react';
import { Container, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import BookingForm from './BookingForm';
import ReservationTable from './ReservationTable';

const STORAGE_KEY = 'little-lemon-reservations';

const BookingPage = () => {
  const [reservations, setReservations] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [editingReservation, setEditingReservation] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);

  // Persist reservations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  }, [reservations]);

  const handleSubmitSuccess = (formData) => {
    if (editingReservation) {
      // Update existing reservation
      const updatedReservations = reservations.map(res => 
        res.id === editingReservation.id ? { ...formData, id: res.id } : res
      );
      setReservations(updatedReservations);
      setEditingReservation(null);
    } else {
      // Add new reservation with unique ID and timestamp
      const newReservation = {
        ...formData,
        id: Date.now(),
        createdAt: new Date().toISOString()
      };
      setReservations([...reservations, newReservation]);
    }
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
  };

  const handleDelete = (reservation) => {
    setReservationToDelete(reservation);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    setReservations(reservations.filter(res => res.id !== reservationToDelete.id));
    setDeleteDialogOpen(false);
    setReservationToDelete(null);
  };

  const handleCancel = () => {
    setEditingReservation(null);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4 }}>
        {editingReservation ? 'Edit Reservation' : 'Make a Reservation'}
      </Typography>
      
      <BookingForm
        onSubmitSuccess={handleSubmitSuccess}
        initialValues={editingReservation}
        onCancel={editingReservation ? handleCancel : undefined}
        isEditing={!!editingReservation}
      />

      {reservations.length > 0 && (
        <>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 6 }}>
            Your Reservations
          </Typography>
          <ReservationTable
            reservations={reservations}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          Are you sure you want to delete this reservation?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BookingPage;
