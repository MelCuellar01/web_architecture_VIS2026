import { useState } from 'react';

export default function PlaceForm({ onAddPlace }) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    imageUrl: '',
    visitDate: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.location) return;
    
    setSubmitting(true);
    await onAddPlace({
      ...formData,
      visitDate: new Date(formData.visitDate).toISOString()
    });
    
    // Reset form
    setFormData({
      name: '',
      location: '',
      description: '',
      imageUrl: '',
      visitDate: new Date().toISOString().split('T')[0]
    });
    setSubmitting(false);
  };

  return (
    <div className="glass-pane glass-card">
      <h2 className="form-title">Log a New Adventure</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Place Name</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            placeholder="e.g. The Eiffel Tower"
            required 
          />
        </div>
        
        <div className="form-group">
          <label>Location</label>
          <input 
            type="text" 
            name="location" 
            value={formData.location} 
            onChange={handleChange} 
            placeholder="e.g. Paris, France"
            required 
          />
        </div>

        <div className="form-group">
          <label>Date Visited</label>
          <input 
            type="date" 
            name="visitDate" 
            value={formData.visitDate} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label>Photo URL (optional)</label>
          <input 
            type="url" 
            name="imageUrl" 
            value={formData.imageUrl} 
            onChange={handleChange} 
            placeholder="https://..."
          />
        </div>

        <div className="form-group">
          <label>My Experience</label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            placeholder="It was breathtaking..."
            rows="3"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Place'}
        </button>
      </form>
    </div>
  );
}
