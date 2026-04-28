import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import AuthForm from '../components/common/AuthForm';

const SupervisorLogin = () => {
  const { loginSupervisor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await loginSupervisor(form.email, form.password);
      toast.success(`Maintenance access granted. Welcome, ${user.name}.`);
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Maintenance login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      icon="🛠️"
      title="Maintenance Access"
      subtitle="Supervisor emergency login"
      emailPlaceholder="supervisor@email.com"
      loading={loading}
      onSubmit={handleSubmit}
      form={form}
      setForm={setForm}
      forgotPasswordLink={false}
    />
  );
};

export default SupervisorLogin;
